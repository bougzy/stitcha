import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  PATCH /api/orders/batch                                                    */
/*  Update status of multiple orders at once                                   */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { orderIds, status } = (await request.json()) as {
      orderIds: string[];
      status: string;
    };

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No orders selected" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending", "confirmed", "cutting", "sewing",
      "fitting", "finishing", "ready", "delivered", "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await Order.updateMany(
      { _id: { $in: orderIds }, designerId },
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            note: "Batch status update",
          },
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: { updated: result.modifiedCount },
    });
  } catch (error) {
    console.error("PATCH /api/orders/batch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
