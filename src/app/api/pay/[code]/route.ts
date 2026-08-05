import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentLink } from "@/lib/models/payment-link";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/pay/[code]                                                       */
/*  Public — no auth. Returns only what a paying client needs to see:         */
/*  amount, label, order title, designer's business name + bank account.      */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    await connectDB();

    const link = await PaymentLink.findOne({ code }).lean();
    if (!link) {
      return NextResponse.json({ success: false, error: "Payment link not found" }, { status: 404 });
    }

    const [order, designer] = await Promise.all([
      Order.findById(link.orderId).select("title garmentType").lean(),
      Designer.findById(link.designerId).select("businessName name phone bankAccount").lean(),
    ]);

    const o = order as { title?: string; garmentType?: string } | null;
    const d = designer as {
      businessName?: string;
      name?: string;
      phone?: string;
      bankAccount?: { bankName?: string; accountNumber?: string; accountName?: string };
    } | null;

    return NextResponse.json({
      success: true,
      data: {
        label: link.label,
        amount: link.amount,
        currency: link.currency || "NGN",
        status: link.status,
        orderTitle: o?.title || o?.garmentType || "Order",
        businessName: d?.businessName || d?.name || "Your designer",
        businessPhone: d?.phone,
        bankAccount: d?.bankAccount || null,
      },
    });
  } catch (error) {
    console.error("GET /api/pay/[code] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
