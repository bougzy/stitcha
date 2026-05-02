import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { logActivity } from "@/lib/models/activity-log";
import { BOOST_DURATION_DAYS, SMS_PACKS, STUDIO_ADDON } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  Paystack webhook — unified handler for all monetised flows.                */
/*                                                                              */
/*  Recognised metadata.purpose values (set by the initialising endpoint):    */
/*    "subscription" — plan upgrade  (default if metadata.purpose missing)    */
/*    "boost_post"   — Discover-feed boost (₦500 / 7 days)                    */
/*    "sms_pack"     — SMS credit pack (Termii passthrough)                   */
/*    "studio_addon" — branded PDFs + vanity URL (₦1000 / 30 days)            */
/*                                                                              */
/*  Each purpose updates the right model and writes to the activity log.      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    // Verify Paystack signature
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const hash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const data = event.data;
    const metadata = data.metadata || {};
    const purpose: string = metadata.purpose || "subscription";
    const designerId: string | undefined = metadata.designerId;
    const reference: string = data.reference;
    const amountNGN: number = (data.amount ?? 0) / 100;

    if (!designerId) {
      console.error("Paystack webhook missing designerId metadata", metadata);
      return NextResponse.json({ received: true });
    }

    switch (purpose) {
      /* ---- 1) Subscription upgrade ---- */
      case "subscription": {
        const planId = metadata.planId;
        if (!planId) break;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        await Designer.findByIdAndUpdate(designerId, {
          subscription: planId,
          subscriptionExpiry: expiry,
          paystackCustomerId: data.customer?.customer_code || undefined,
        });
        await logActivity({
          designerId,
          action: "upgrade_subscription",
          entity: "settings",
          details: `Upgraded to ${planId} plan via Paystack`,
          metadata: { planId, reference, amount: amountNGN },
        });
        break;
      }

      /* ---- 2) Discover-feed boost ---- */
      case "boost_post": {
        const orderId = metadata.orderId;
        const days = Number(metadata.durationDays) || BOOST_DURATION_DAYS;
        if (!orderId) break;

        // Extend boost from "now" or from the existing boostedUntil if it's
        // still in the future, so re-boosting stacks rather than resets.
        const order = await Order.findById(orderId).select("boostedUntil");
        const base = order?.boostedUntil && order.boostedUntil > new Date()
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
          details: `Boosted post on Discover for ${days} days`,
          metadata: { reference, amount: amountNGN, boostedUntil: base.toISOString() },
        });
        break;
      }

      /* ---- 3) SMS credit pack ---- */
      case "sms_pack": {
        const packId = metadata.packId;
        const pack = SMS_PACKS.find((p) => p.id === packId);
        if (!pack) break;
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
          details: `Bought ${pack.count} SMS credits (${pack.label})`,
          metadata: { packId, reference, amount: amountNGN },
        });
        break;
      }

      /* ---- 4) Studio addon (branded PDFs) ---- */
      case "studio_addon": {
        const days = STUDIO_ADDON.durationDays;
        // Stack expiry: extend from current expiry if still active.
        const designer = await Designer.findById(designerId).select("studioAddon").lean();
        const studio = (designer as Record<string, unknown> | null)?.studioAddon as
          | { expiresAt?: Date | string; brandColor?: string; logoUrl?: string }
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
          details: `Studio addon active until ${base.toLocaleDateString("en-NG")}`,
          metadata: { reference, amount: amountNGN, expiresAt: base.toISOString() },
        });
        break;
      }

      default:
        console.warn("Unknown Paystack purpose:", purpose);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
