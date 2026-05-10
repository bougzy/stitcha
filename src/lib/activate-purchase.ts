/* -------------------------------------------------------------------------- */
/*  activatePurchase()                                                          */
/*                                                                              */
/*  Single source of truth for "give the designer the thing they paid for".   */
/*  Called by:                                                                  */
/*    1. /api/billing/webhook on a successful Paystack charge                  */
/*    2. /api/admin/manual-payments/[id]/verify when admin approves a manual */
/*       bank-transfer payment                                                 */
/*                                                                              */
/*  Both callers feed in the same shape, so any future activation logic       */
/*  changes apply uniformly across both payment paths.                         */
/* -------------------------------------------------------------------------- */

import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { logActivity } from "@/lib/models/activity-log";
import { Notification } from "@/lib/models/notification";
import { BOOST_DURATION_DAYS, SMS_PACKS, STUDIO_ADDON } from "@/lib/constants";

export type PurchasePurpose =
  | "subscription"
  | "boost_post"
  | "sms_pack"
  | "studio_addon";

export interface ActivatePurchaseInput {
  designerId: string;
  purpose: PurchasePurpose;
  /** Provenance — which payment system fired this. */
  source: "paystack" | "manual";
  /** Free-form reference (Paystack reference, manual-payment _id, etc.) */
  reference: string;
  amountNGN: number;
  /** Per-purpose payload. */
  payload: {
    planId?: "free" | "plus" | "pro";
    orderId?: string;
    packId?: string;
    durationDays?: number;
    paystackCustomerCode?: string;
  };
}

export interface ActivatePurchaseResult {
  ok: boolean;
  detail: string;
}

export async function activatePurchase(
  input: ActivatePurchaseInput,
): Promise<ActivatePurchaseResult> {
  const { designerId, purpose, source, reference, amountNGN, payload } = input;

  switch (purpose) {
    /* ------------------------- Subscription upgrade ----------------------- */
    case "subscription": {
      const planId = payload.planId;
      if (!planId) return { ok: false, detail: "missing planId" };

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      await Designer.findByIdAndUpdate(designerId, {
        subscription: planId,
        subscriptionExpiry: expiry,
        ...(payload.paystackCustomerCode
          ? { paystackCustomerId: payload.paystackCustomerCode }
          : {}),
      });
      await logActivity({
        designerId,
        action: "upgrade_subscription",
        entity: "settings",
        details: `Upgraded to ${planId} via ${source}`,
        metadata: { planId, reference, amount: amountNGN, source },
      });
      await Notification.create({
        designerId,
        type: "system",
        title: `🎉 ${planId.toUpperCase()} plan active`,
        message: `Your subscription is now active until ${expiry.toLocaleDateString("en-NG", {
          day: "numeric", month: "short", year: "numeric",
        })}.`,
        link: "/billing",
      }).catch(() => { /* non-fatal */ });
      return { ok: true, detail: `Subscription set to ${planId}` };
    }

    /* ----------------------- Discover-feed Boost -------------------------- */
    case "boost_post": {
      const orderId = payload.orderId;
      const days = Number(payload.durationDays) || BOOST_DURATION_DAYS;
      if (!orderId) return { ok: false, detail: "missing orderId" };

      const order = await Order.findOne({ _id: orderId, designerId }).select("boostedUntil title");
      if (!order) return { ok: false, detail: "order not found" };

      const base = order.boostedUntil && order.boostedUntil > new Date()
        ? new Date(order.boostedUntil)
        : new Date();
      base.setDate(base.getDate() + days);

      await Order.findByIdAndUpdate(orderId, {
        $set: { boostedUntil: base },
        $inc: { boostCount: 1 },
      });
      await logActivity({
        designerId,
        action: "boost_post",
        entity: "order",
        entityId: orderId,
        details: `Boosted for ${days} days via ${source}`,
        metadata: { reference, amount: amountNGN, source, boostedUntil: base.toISOString() },
      });
      await Notification.create({
        designerId,
        type: "system",
        title: "🚀 Boost active",
        message: `"${order.title}" is now pinned to the top of /discover until ${base.toLocaleDateString("en-NG", {
          day: "numeric", month: "short",
        })}.`,
        link: `/orders/${orderId}`,
      }).catch(() => { /* non-fatal */ });
      return { ok: true, detail: `Boost extended ${days} days` };
    }

    /* ---------------------------- SMS pack -------------------------------- */
    case "sms_pack": {
      const packId = payload.packId;
      const pack = SMS_PACKS.find((p) => p.id === packId);
      if (!pack) return { ok: false, detail: "unknown pack" };
      await Designer.findByIdAndUpdate(designerId, {
        $inc: {
          smsBalance: pack.count,
          smsLifetimePurchased: pack.count,
        },
      });
      await logActivity({
        designerId,
        action: "buy_sms_pack",
        entity: "settings",
        details: `Bought ${pack.count} SMS credits (${pack.label}) via ${source}`,
        metadata: { packId, reference, amount: amountNGN, source },
      });
      await Notification.create({
        designerId,
        type: "system",
        title: `📨 ${pack.count} SMS credits added`,
        message: `Your SMS balance has been topped up.`,
        link: "/billing",
      }).catch(() => { /* non-fatal */ });
      return { ok: true, detail: `+${pack.count} SMS credits` };
    }

    /* -------------------------- Studio addon ------------------------------ */
    case "studio_addon": {
      const days = STUDIO_ADDON.durationDays;
      const designer = await Designer.findById(designerId).select("studioAddon").lean();
      const studio = (designer as unknown as Record<string, unknown> | null)?.studioAddon as
        | { expiresAt?: Date | string; brandColor?: string }
        | undefined;
      const currentExpiry = studio?.expiresAt ? new Date(studio.expiresAt) : null;
      const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
      base.setDate(base.getDate() + days);
      await Designer.findByIdAndUpdate(designerId, {
        $set: {
          "studioAddon.expiresAt": base,
          ...(studio?.brandColor ? {} : { "studioAddon.brandColor": "#C75B39" }),
        },
      });
      await logActivity({
        designerId,
        action: "buy_studio_addon",
        entity: "settings",
        details: `Studio active until ${base.toLocaleDateString("en-NG")} via ${source}`,
        metadata: { reference, amount: amountNGN, source, expiresAt: base.toISOString() },
      });
      await Notification.create({
        designerId,
        type: "system",
        title: "✨ Studio activated",
        message: `Your branded PDFs and custom shop URL are live until ${base.toLocaleDateString("en-NG", {
          day: "numeric", month: "short", year: "numeric",
        })}.`,
        link: "/billing",
      }).catch(() => { /* non-fatal */ });
      return { ok: true, detail: `Studio extended ${days} days` };
    }

    default:
      return { ok: false, detail: `Unknown purpose: ${purpose}` };
  }
}
