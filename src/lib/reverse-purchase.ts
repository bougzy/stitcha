/* -------------------------------------------------------------------------- */
/*  reversePurchase()                                                            */
/*                                                                              */
/*  Best-effort rollback of an activatePurchase() call. Used by the admin    */
/*  refund flow to undo a previously-verified manual payment.                  */
/*                                                                              */
/*  Each branch is conservative:                                                */
/*    • Subscriptions revert to "free" (we don't track the previous plan).    */
/*    • Boost: pulls boostedUntil back by durationDays (or unsets if it       */
/*      would land in the past).                                                */
/*    • SMS pack: deducts up to the pack's count, never below zero.            */
/*    • Studio: pulls studioAddon.expiresAt back by durationDays (or unsets). */
/*                                                                              */
/*  Returns a result with a human summary AND a notes[] list of partial      */
/*  rollbacks (e.g. "SMS pack only partly refunded — 12 of 50 already used"). */
/*  Every refund writes to ActivityLog and notifies the designer.              */
/* -------------------------------------------------------------------------- */

import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { Notification } from "@/lib/models/notification";
import { logActivity } from "@/lib/models/activity-log";
import { SMS_PACKS, STUDIO_ADDON, BOOST_DURATION_DAYS } from "@/lib/constants";
import type { PurchasePurpose } from "@/lib/activate-purchase";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReversePurchaseInput {
  designerId: string;
  purpose: PurchasePurpose;
  reference: string;
  amountNGN: number;
  /** Same payload shape activatePurchase received. */
  payload: {
    planId?: "free" | "plus" | "pro";
    orderId?: string;
    packId?: string;
    durationDays?: number;
  };
  reason: string;
}

export interface ReversePurchaseResult {
  ok: boolean;
  summary: string;
  notes: string[];
}

export async function reversePurchase(
  input: ReversePurchaseInput,
): Promise<ReversePurchaseResult> {
  const { designerId, purpose, reference, amountNGN, payload, reason } = input;
  const notes: string[] = [];

  switch (purpose) {
    /* ---------------------------- Subscription ---------------------------- */
    case "subscription": {
      // We don't store the previous plan/expiry on the manual-payment record,
      // so the safest revert is to drop them to Free with no expiry.
      // (Admin can re-grant via /admin/designers/[id] if they had grandfathered access.)
      const designer = await Designer.findByIdAndUpdate(
        designerId,
        { subscription: "free", subscriptionExpiry: null },
        { new: false, projection: { subscription: 1, subscriptionExpiry: 1 } },
      ).lean();
      const prev = designer as unknown as { subscription?: string; subscriptionExpiry?: Date } | null;
      const summary = `Subscription reverted from ${prev?.subscription ?? "?"} to free.`;
      notes.push(summary);
      await afterReverse({
        designerId,
        purpose,
        reference,
        amountNGN,
        reason,
        title: "↩️ Subscription refunded",
        message: `An admin reversed your ${prev?.subscription?.toUpperCase() || "paid"} plan payment (${reference}). You're back on Free. Reason: ${reason}`,
      });
      return { ok: true, summary, notes };
    }

    /* ----------------------------- Boost --------------------------------- */
    case "boost_post": {
      const orderId = payload.orderId;
      const days = Number(payload.durationDays) || BOOST_DURATION_DAYS;
      if (!orderId) return { ok: false, summary: "Missing orderId.", notes: [] };

      const order = await Order.findById(orderId).select("boostedUntil boostCount title");
      if (!order) {
        return { ok: false, summary: "Order not found.", notes: [] };
      }

      const orig = order.boostedUntil ? new Date(order.boostedUntil) : null;
      let newUntil: Date | null = null;
      if (orig && orig > new Date()) {
        // Pull back by `days`. If that lands before now, just unset.
        const candidate = new Date(orig.getTime() - days * DAY_MS);
        newUntil = candidate > new Date() ? candidate : null;
      }
      if (newUntil) {
        order.boostedUntil = newUntil;
      } else {
        // Mongoose can't unset via assignment to undefined for non-required Date fields
        // reliably — use $unset directly.
        await Order.updateOne({ _id: orderId }, { $unset: { boostedUntil: "" } });
      }
      // Decrement count, never below zero
      order.boostCount = Math.max(0, (order.boostCount ?? 0) - 1);
      await order.save();

      const summary = newUntil
        ? `Boost on "${order.title}" trimmed by ${days} days (now ends ${newUntil.toLocaleDateString("en-NG")}).`
        : `Boost on "${order.title}" cleared.`;
      notes.push(summary);
      await afterReverse({
        designerId,
        purpose,
        reference,
        amountNGN,
        reason,
        title: "↩️ Boost refunded",
        message: `An admin reversed the boost on "${order.title}" (${reference}). Reason: ${reason}`,
      });
      return { ok: true, summary, notes };
    }

    /* ---------------------------- SMS pack ------------------------------- */
    case "sms_pack": {
      const packId = payload.packId;
      const pack = SMS_PACKS.find((p) => p.id === packId);
      if (!pack) return { ok: false, summary: "Unknown SMS pack.", notes: [] };

      // Atomic deduction with $max to never go below zero.
      const before = await Designer.findById(designerId).select("smsBalance").lean();
      const beforeBal = ((before as unknown as Record<string, unknown> | null)?.smsBalance as number) ?? 0;
      const deductBy = Math.min(beforeBal, pack.count);
      await Designer.updateOne(
        { _id: designerId },
        { $inc: { smsBalance: -deductBy, smsLifetimePurchased: -pack.count } },
      );
      // Lifetime can go negative in our schema (min: 0) — Mongoose will clamp on insert
      // but $inc bypasses validation. Force-clamp afterward:
      await Designer.updateOne(
        { _id: designerId, smsLifetimePurchased: { $lt: 0 } },
        { $set: { smsLifetimePurchased: 0 } },
      );

      let summary = `Deducted ${deductBy} SMS credits.`;
      if (deductBy < pack.count) {
        summary += ` (${pack.count - deductBy} were already spent — partial refund.)`;
        notes.push(`Designer had already used ${pack.count - deductBy} of ${pack.count} credits before refund.`);
      } else {
        notes.push(summary);
      }
      await afterReverse({
        designerId,
        purpose,
        reference,
        amountNGN,
        reason,
        title: "↩️ SMS pack refunded",
        message: `An admin reversed your ${pack.count}-SMS pack (${reference}). ${summary} Reason: ${reason}`,
      });
      return { ok: true, summary, notes };
    }

    /* --------------------------- Studio addon ---------------------------- */
    case "studio_addon": {
      const days = Number(payload.durationDays) || STUDIO_ADDON.durationDays;
      const designer = await Designer.findById(designerId).select("studioAddon").lean();
      const studio = (designer as unknown as Record<string, unknown> | null)?.studioAddon as
        | { expiresAt?: Date | string }
        | undefined;
      const orig = studio?.expiresAt ? new Date(studio.expiresAt) : null;

      if (orig && orig > new Date()) {
        const candidate = new Date(orig.getTime() - days * DAY_MS);
        if (candidate > new Date()) {
          await Designer.updateOne(
            { _id: designerId },
            { $set: { "studioAddon.expiresAt": candidate } },
          );
          const summary = `Studio addon trimmed by ${days} days (now ends ${candidate.toLocaleDateString("en-NG")}).`;
          notes.push(summary);
          await afterReverse({
            designerId,
            purpose,
            reference,
            amountNGN,
            reason,
            title: "↩️ Studio addon refunded (partial)",
            message: `An admin trimmed your Studio addon by ${days} days. Reason: ${reason}`,
          });
          return { ok: true, summary, notes };
        }
      }

      await Designer.updateOne(
        { _id: designerId },
        { $unset: { "studioAddon.expiresAt": "" } },
      );
      const summary = "Studio addon expiry cleared.";
      notes.push(summary);
      await afterReverse({
        designerId,
        purpose,
        reference,
        amountNGN,
        reason,
        title: "↩️ Studio addon refunded",
        message: `An admin reversed your Studio addon payment (${reference}). Reason: ${reason}`,
      });
      return { ok: true, summary, notes };
    }
  }

  return { ok: false, summary: `Unknown purpose: ${purpose}`, notes: [] };
}

/* -------------------------------------------------------------------------- */
/*  Shared post-reversal side-effects                                          */
/* -------------------------------------------------------------------------- */

async function afterReverse(args: {
  designerId: string;
  purpose: PurchasePurpose;
  reference: string;
  amountNGN: number;
  reason: string;
  title: string;
  message: string;
}) {
  await logActivity({
    designerId: args.designerId,
    action: "admin_refund",
    entity: "settings",
    details: `Refunded ${args.purpose.replace("_", " ")} (${args.reference}) — ${args.reason}`,
    metadata: {
      purpose: args.purpose,
      reference: args.reference,
      amount: args.amountNGN,
      reason: args.reason,
      source: "admin_refund",
    },
  });
  Notification.create({
    designerId: args.designerId,
    type: "system",
    title: args.title,
    message: args.message,
    link: "/billing",
  }).catch(() => { /* non-fatal */ });
}
