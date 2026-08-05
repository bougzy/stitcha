import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentLink } from "@/lib/models/payment-link";
import { Order } from "@/lib/models/order";
import { Notification } from "@/lib/models/notification";

/* -------------------------------------------------------------------------- */
/*  POST /api/pay/[code]/mark-paid                                            */
/*  Public — no auth. Client taps "I've sent this" after a bank transfer.     */
/*  Does NOT touch Order.payments — only the designer confirming actually     */
/*  applies the payment. This just raises a flag + notifies the designer so   */
/*  they know to go check their bank account.                                 */
/* -------------------------------------------------------------------------- */

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    await connectDB();

    const link = await PaymentLink.findOne({ code });
    if (!link) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 });
    }
    if (link.status === "confirmed" || link.status === "cancelled") {
      return NextResponse.json({ success: false, error: "This link is no longer active" }, { status: 409 });
    }

    link.status = "client_marked_paid";
    link.clientMarkedPaidAt = new Date();
    await link.save();

    const order = await Order.findById(link.orderId).select("title").lean();
    const orderTitle = (order as { title?: string } | null)?.title || "your order";

    Notification.create({
      designerId: link.designerId,
      type: "system",
      title: "💰 Client says they've paid",
      message: `A client marked "${link.label}" (₦${link.amount.toLocaleString()}) as sent for "${orderTitle}". Check your bank account, then confirm it in the order.`,
      link: `/orders/${link.orderId}`,
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ success: true, data: { status: link.status } });
  } catch (error) {
    console.error("POST /api/pay/[code]/mark-paid error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
