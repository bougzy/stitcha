import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { ManualPayment } from "@/lib/models/manual-payment";
import { activatePurchase } from "@/lib/activate-purchase";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/manual-payments/[id]/verify                                */
/*                                                                              */
/*  Admin marks a pending manual payment as verified. The shared              */
/*  activatePurchase() helper performs the actual activation (subscription,   */
/*  boost, SMS top-up, Studio extension), so the result is identical to a    */
/*  Paystack-driven purchase.                                                  */
/*                                                                              */
/*  Idempotent: re-verifying an already-verified payment is a no-op.          */
/* -------------------------------------------------------------------------- */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const payment = await ManualPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (payment.status === "verified") {
      return NextResponse.json({
        success: true,
        data: { alreadyVerified: true },
      });
    }
    if (payment.status === "rejected") {
      return NextResponse.json(
        { success: false, error: "This payment was already rejected." },
        { status: 409 },
      );
    }

    const result = await activatePurchase({
      designerId: String(payment.designerId),
      purpose: payment.purpose,
      source: "manual",
      reference: payment.reference,
      amountNGN: payment.amount,
      payload: {
        planId:       payment.payload?.planId,
        orderId:      payment.payload?.orderId,
        packId:       payment.payload?.packId,
        durationDays: payment.payload?.durationDays,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: `Activation failed: ${result.detail}` },
        { status: 500 },
      );
    }

    payment.status = "verified";
    payment.verifiedAt = new Date();
    await payment.save();

    return NextResponse.json({ success: true, data: { detail: result.detail } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
