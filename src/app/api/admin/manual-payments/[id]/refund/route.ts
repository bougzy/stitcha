import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { ManualPayment } from "@/lib/models/manual-payment";
import { reversePurchase } from "@/lib/reverse-purchase";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/manual-payments/[id]/refund                                */
/*  Body: { reason: string }                                                    */
/*                                                                              */
/*  Rolls back a previously-verified manual payment:                           */
/*    1. Calls reversePurchase() — best-effort revert of the activation       */
/*       (subscription → free, boost trimmed, SMS deducted, Studio trimmed)   */
/*    2. Marks the payment as status="refunded" with adminNote + summary      */
/*    3. Notifies the designer with the reason                                */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
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

    const body = (await request.json()) as { reason?: string };
    const reason = (body.reason || "").trim().slice(0, 500);
    if (!reason || reason.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Add a short refund reason (visible to the designer + audit log).",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const payment = await ManualPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (payment.status === "refunded") {
      return NextResponse.json({
        success: true,
        data: { alreadyRefunded: true, summary: payment.refundDetails?.summary || "Already refunded." },
      });
    }
    if (payment.status !== "verified") {
      return NextResponse.json(
        {
          success: false,
          error: `Only verified payments can be refunded. This one is ${payment.status}.`,
        },
        { status: 409 },
      );
    }

    const result = await reversePurchase({
      designerId: String(payment.designerId),
      purpose: payment.purpose,
      reference: payment.reference,
      amountNGN: payment.amount,
      payload: {
        planId: payment.payload?.planId,
        orderId: payment.payload?.orderId,
        packId: payment.payload?.packId,
        durationDays: payment.payload?.durationDays,
      },
      reason,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: `Refund failed: ${result.summary}` },
        { status: 500 },
      );
    }

    payment.status = "refunded";
    payment.refundedAt = new Date();
    payment.adminNote = reason;
    payment.refundDetails = {
      summary: result.summary,
      notes: result.notes,
    };
    await payment.save();

    return NextResponse.json({
      success: true,
      data: {
        summary: result.summary,
        notes: result.notes,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
