import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { logActivity } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/correction-request                                   */
/*  Staff submits a correction request (logged for owner review)              */
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

    const designerId = session.user.id;
    const { id } = await params;
    const body = await request.json();
    const { reason, type } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Please provide a reason for the correction" },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findOne({ _id: id, designerId, isDeleted: { $ne: true } })
      .select("title price status")
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Log the correction request for owner review
    logActivity({
      designerId,
      action: "correction_request",
      entity: "order",
      entityId: id,
      details: `Correction requested for "${order.title}": ${reason}`,
      metadata: {
        type: type || "general",
        reason,
        orderTitle: order.title,
        requestedBy: session.user.name || session.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Correction request submitted. The account owner will be notified.",
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/correction-request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
