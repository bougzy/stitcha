import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { logActivity } from "@/lib/models/activity-log";

export async function POST(request: Request) {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    // Verify Paystack signature
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { metadata, customer } = event.data;
      const { designerId, planId } = metadata || {};

      if (!designerId || !planId) {
        console.error("Missing metadata in Paystack webhook:", metadata);
        return NextResponse.json({ received: true });
      }

      await connectDB();

      // 30-day subscription period
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);

      const designer = await Designer.findByIdAndUpdate(
        designerId,
        {
          subscription: planId,
          subscriptionExpiry,
          paystackCustomerId: customer?.customer_code || undefined,
        },
        { new: true }
      );

      if (designer) {
        await logActivity({
          designerId,
          action: "upgrade_subscription",
          entity: "settings",
          details: `Upgraded to ${planId} plan via Paystack`,
          metadata: {
            planId,
            reference: event.data.reference,
            amount: event.data.amount / 100,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
