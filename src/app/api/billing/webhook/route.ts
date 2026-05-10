import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { activatePurchase, type PurchasePurpose } from "@/lib/activate-purchase";
import { notifyAdmin } from "@/lib/admin-notify";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  Paystack webhook — thin wrapper that hands off to activatePurchase().      */
/*  All actual side-effects (subscription update, boost extension, SMS top   */
/*  up, Studio activation) live in lib/activate-purchase.ts and are shared   */
/*  with the manual-payment admin verify path.                                 */
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
    const purpose = (metadata.purpose || "subscription") as PurchasePurpose;
    const designerId: string | undefined = metadata.designerId;
    const reference: string = data.reference;
    const amountNGN: number = (data.amount ?? 0) / 100;

    if (!designerId) {
      console.error("Paystack webhook missing designerId metadata", metadata);
      return NextResponse.json({ received: true });
    }

    const result = await activatePurchase({
      designerId,
      purpose,
      source: "paystack",
      reference,
      amountNGN,
      payload: {
        planId: metadata.planId,
        orderId: metadata.orderId,
        packId: metadata.packId,
        durationDays: metadata.durationDays
          ? Number(metadata.durationDays)
          : undefined,
        paystackCustomerCode: data.customer?.customer_code,
      },
    });

    if (!result.ok) {
      console.warn("Paystack webhook activation failed:", result.detail, metadata);
    }

    // Surface to admin (info — already auto-activated, no action needed)
    try {
      const designer = await Designer.findById(designerId)
        .select("name businessName")
        .lean();
      const d = (designer as unknown as Record<string, unknown> | null) ?? null;
      const designerLabel =
        (d?.businessName as string | undefined) ||
        (d?.name as string | undefined) ||
        "A designer";
      notifyAdmin({
        kind: "paystack_payment_succeeded",
        severity: result.ok ? "info" : "warning",
        title: result.ok
          ? `💳 Paystack payment — ₦${amountNGN.toLocaleString("en-NG")}`
          : `⚠️ Paystack activation failed — ₦${amountNGN.toLocaleString("en-NG")}`,
        message: result.ok
          ? `${designerLabel}: ${purpose.replace("_", " ")} activated automatically.`
          : `${designerLabel}: ${purpose.replace("_", " ")} payment couldn't activate (${result.detail}). Investigate.`,
        link: result.ok ? "/admin/payments?status=all" : "/admin/payments",
        designerId,
        meta: { reference, amount: amountNGN, purpose, payload: metadata },
      }).catch(() => { /* non-fatal */ });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
