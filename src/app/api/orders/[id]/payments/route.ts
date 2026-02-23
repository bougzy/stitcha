import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { logActivity } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/payments                                            */
/*  Record a payment against an order                                         */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();

    const { amount, method, note } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const validMethods = ["cash", "bank_transfer", "card", "mobile_money", "other"];
    if (method && !validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findOne({ _id: id, designerId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Add payment
    const payment = {
      amount,
      method: method || "cash",
      note: note || undefined,
      paidAt: new Date(),
    };

    order.payments = order.payments || [];
    order.payments.push(payment);

    // Recalculate depositPaid from all payments
    const totalPaid = order.payments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );
    order.depositPaid = totalPaid;

    // Update payment status
    if (totalPaid >= order.price) {
      order.paymentStatus = "paid";
    } else if (totalPaid > 0) {
      order.paymentStatus = "partial";
    } else {
      order.paymentStatus = "unpaid";
    }

    await order.save();

    // Audit log
    logActivity({
      designerId,
      action: "record_payment",
      entity: "payment",
      entityId: id,
      details: `Recorded ${method || "cash"} payment of ${amount} for "${order.title}"`,
      metadata: { amount, method: method || "cash", totalPaid, orderTitle: order.title },
    });

    // Blind Receipting: staff cannot see reconciled balance
    const designer = await Designer.findById(designerId).select("role").lean();
    const isOwner = !designer || designer.role === "owner";

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment: JSON.parse(JSON.stringify(payment)),
        totalPaid: isOwner ? totalPaid : undefined,
        balance: isOwner ? order.price - totalPaid : undefined,
        paymentStatus: isOwner ? order.paymentStatus : undefined,
        blindReceipt: !isOwner,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/payments error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/orders/[id]/payments                                          */
/*  Remove a payment from an order                                            */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Zero-delete policy: only owners can remove payments
    const designer = await Designer.findById(designerId).select("role").lean();
    if (designer && designer.role !== "owner") {
      return NextResponse.json(
        { success: false, error: "Only the account owner can remove payments. Request a correction from your Oga." },
        { status: 403 }
      );
    }

    const order = await Order.findOne({ _id: id, designerId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Remove payment
    order.payments = (order.payments || []).filter(
      (p: { _id: { toString: () => string } }) => p._id.toString() !== paymentId
    );

    // Recalculate
    const totalPaid = order.payments.reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );
    order.depositPaid = totalPaid;

    if (totalPaid >= order.price) {
      order.paymentStatus = "paid";
    } else if (totalPaid > 0) {
      order.paymentStatus = "partial";
    } else {
      order.paymentStatus = "unpaid";
    }

    await order.save();

    // Audit log
    logActivity({
      designerId,
      action: "delete_payment",
      entity: "payment",
      entityId: id,
      details: `Removed payment (ID: ${paymentId}) from "${order.title}"`,
      metadata: { paymentId, totalPaid, orderTitle: order.title },
    });

    return NextResponse.json({
      success: true,
      message: "Payment removed",
      data: {
        totalPaid,
        balance: order.price - totalPaid,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("DELETE /api/orders/[id]/payments error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
