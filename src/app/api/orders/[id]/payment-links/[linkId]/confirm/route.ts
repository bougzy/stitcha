import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { PaymentLink } from "@/lib/models/payment-link";
import { logActivity } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/payment-links/[linkId]/confirm                      */
/*  Designer confirms money actually landed in their account. Applies the     */
/*  link's amount to Order.payments[] using the same recalculation logic as   */
/*  the manual "record payment" flow, then marks the link confirmed.          */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { id, linkId } = await params;

    await connectDB();

    const link = await PaymentLink.findOne({ _id: linkId, designerId, orderId: id });
    if (!link) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 });
    }
    if (link.status === "confirmed") {
      return NextResponse.json({ success: false, error: "Already confirmed" }, { status: 409 });
    }
    if (link.status === "cancelled") {
      return NextResponse.json({ success: false, error: "This link was cancelled" }, { status: 409 });
    }

    const order = await Order.findOne({ _id: id, designerId });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Same recalculation logic as /api/orders/[id]/payments
    const payment = {
      amount: link.amount,
      method: "bank_transfer" as const,
      note: `Payment link: ${link.label}`,
      paidAt: new Date(),
    };
    order.payments = order.payments || [];
    order.payments.push(payment);

    const totalPaid = order.payments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );
    order.depositPaid = totalPaid;
    order.paymentStatus =
      totalPaid >= order.price ? "paid" : totalPaid > 0 ? "partial" : "unpaid";

    await order.save();

    link.status = "confirmed";
    link.confirmedAt = new Date();
    await link.save();

    logActivity({
      designerId,
      action: "confirm_payment_link",
      entity: "payment",
      entityId: String(link._id),
      details: `Confirmed ₦${link.amount.toLocaleString()} (${link.label}) for "${order.title}"`,
      metadata: { orderId: id, amount: link.amount, label: link.label, totalPaid },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalPaid,
        balance: order.price - totalPaid,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/payment-links/[linkId]/confirm error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
