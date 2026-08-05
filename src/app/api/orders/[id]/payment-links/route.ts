import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { PaymentLink } from "@/lib/models/payment-link";
import { logActivity } from "@/lib/models/activity-log";
import { APP_URL } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/payment-links                                       */
/*  Create a shareable payment request against an order (deposit,             */
/*  installment, or balance). Requires the designer to have their bank        */
/*  account on file — the client pays that account directly.                  */
/*                                                                              */
/*  GET /api/orders/[id]/payment-links                                        */
/*  List payment link requests for an order (for the order detail page).      */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const { label, amount } = body as { label?: string; amount?: number };

    if (!label || typeof label !== "string") {
      return NextResponse.json({ success: false, error: "label is required" }, { status: 400 });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    await connectDB();

    const [order, designer] = await Promise.all([
      Order.findOne({ _id: id, designerId, isDeleted: { $ne: true } }),
      Designer.findById(designerId).select("bankAccount businessName").lean(),
    ]);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const bank = (designer as { bankAccount?: { bankName?: string; accountNumber?: string; accountName?: string } } | null)
      ?.bankAccount;
    if (!bank?.bankName || !bank?.accountNumber || !bank?.accountName) {
      return NextResponse.json(
        {
          success: false,
          error: "Add your bank account details in Settings before creating a payment link — that's what your client will pay into.",
          needsBankAccount: true,
        },
        { status: 400 }
      );
    }

    const code = nanoid(10);
    const link = await PaymentLink.create({
      designerId,
      orderId: id,
      code,
      label: label.trim(),
      amount,
      currency: order.currency || "NGN",
      status: "pending",
    });

    logActivity({
      designerId,
      action: "create_payment_link",
      entity: "payment",
      entityId: String(link._id),
      details: `Created payment link "${label}" for ₦${amount.toLocaleString()} on "${order.title}"`,
      metadata: { orderId: id, amount, label, code },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(link._id),
          code: link.code,
          label: link.label,
          amount: link.amount,
          status: link.status,
          url: `${APP_URL}/pay/${link.code}`,
          createdAt: link.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders/[id]/payment-links error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;

    await connectDB();

    const links = await PaymentLink.find({ designerId, orderId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: links.map((l) => ({
        id: String(l._id),
        code: l.code,
        label: l.label,
        amount: l.amount,
        status: l.status,
        url: `${APP_URL}/pay/${l.code}`,
        clientMarkedPaidAt: l.clientMarkedPaidAt,
        confirmedAt: l.confirmedAt,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/orders/[id]/payment-links error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
