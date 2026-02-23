import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/orders/[id]                                                      */
/*  Get a single order by ID (must belong to the authenticated designer)      */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
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

    await connectDB();

    const order = await Order.findOne({ _id: id, designerId })
      .populate("clientId", "name phone email gender measurements lastMeasuredAt")
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Transform populated clientId to client field
    const { clientId: clientData, ...rest } = order as Record<string, unknown>;
    const transformed = {
      ...rest,
      clientId: clientData && typeof clientData === "object" && "_id" in clientData
        ? (clientData as { _id: string })._id
        : clientData,
      client: clientData && typeof clientData === "object" && "name" in clientData
        ? clientData
        : undefined,
    };

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(transformed)),
    });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/orders/[id]                                                      */
/*  Update an order's details or status                                       */
/* -------------------------------------------------------------------------- */

export async function PUT(
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

    await connectDB();

    // Build update object - allow partial updates including status changes
    const allowedFields = [
      "title",
      "description",
      "status",
      "garmentType",
      "fabric",
      "price",
      "depositPaid",
      "dueDate",
      "notes",
    ];

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // If status is changing, also push to statusHistory
    const updateOps: Record<string, unknown> = { $set: update };
    if (update.status) {
      const existingOrder = await Order.findOne({ _id: id, designerId });
      if (existingOrder && existingOrder.status !== update.status) {
        updateOps.$push = {
          statusHistory: {
            status: update.status,
            changedAt: new Date(),
            note: body.statusNote || undefined,
          },
        };
      }
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, designerId },
      updateOps,
      { new: true, runValidators: true }
    ).populate("clientId", "name phone email gender measurements lastMeasuredAt");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Transform populated clientId to client field
    const orderObj = order.toObject();
    const { clientId: clientData, ...rest } = orderObj as Record<string, unknown>;
    const transformed = {
      ...rest,
      clientId: clientData && typeof clientData === "object" && "_id" in clientData
        ? (clientData as { _id: string })._id
        : clientData,
      client: clientData && typeof clientData === "object" && "name" in clientData
        ? clientData
        : undefined,
    };

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      data: JSON.parse(JSON.stringify(transformed)),
    });
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/orders/[id]                                                   */
/*  Delete an order                                                           */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  _request: Request,
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

    await connectDB();

    const order = await Order.findOneAndDelete({ _id: id, designerId });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
