import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { logActivity } from "@/lib/models/activity-log";
import { checkRolePermission } from "@/lib/subscription";
import { isValidTransition, getNextStatuses } from "@/lib/order-transitions";

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

    const order = await Order.findOne({ _id: id, designerId, isDeleted: { $ne: true } })
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

    // Fetch existing order to check status-based edit restrictions
    const existingOrder = await Order.findOne({ _id: id, designerId, isDeleted: { $ne: true } });
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Fields that are locked once an order is in-progress (cutting, sewing, etc.)
    const IN_PROGRESS_STATUSES = ["cutting", "sewing", "fitting", "finishing", "ready", "delivered"];
    const isInProgress = IN_PROGRESS_STATUSES.includes(existingOrder.status);
    const LOCKED_AFTER_IN_PROGRESS = ["price", "garmentType", "fabric", "clientId"];

    // Price Lock: non-owners can NEVER change the price (requires owner override PIN)
    const designer = await Designer.findById(designerId).select("role").lean();
    const isOwner = !designer || designer.role === "owner";
    const OWNER_ONLY_FIELDS = ["price"];

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
      "receiptSent",
    ];

    // Validate status transition BEFORE building update
    if (body.status && body.status !== existingOrder.status) {
      if (!isValidTransition(existingOrder.status, body.status)) {
        const allowed = getNextStatuses(existingOrder.status);
        return NextResponse.json(
          {
            success: false,
            error: `Cannot change status from "${existingOrder.status}" to "${body.status}"`,
            allowedTransitions: allowed,
          },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = {};
    const warnings: string[] = [];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Enforce read-only after in-progress
        if (isInProgress && LOCKED_AFTER_IN_PROGRESS.includes(field)) {
          warnings.push(`"${field}" is locked once production has started`);
          continue;
        }
        // Price Lock: only owners can modify price
        if (!isOwner && OWNER_ONLY_FIELDS.includes(field)) {
          warnings.push(`Only the account owner can modify "${field}"`);
          continue;
        }
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: warnings.length > 0 ? warnings.join(". ") : "No valid fields to update" },
        { status: 400 }
      );
    }

    // If status is changing, also push to statusHistory
    const updateOps: Record<string, unknown> = { $set: update };
    if (update.status) {
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
      { _id: id, designerId, isDeleted: { $ne: true } },
      updateOps,
      { new: true, runValidators: true }
    ).populate("clientId", "name phone email gender measurements lastMeasuredAt");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Audit log for status changes
    if (update.status) {
      logActivity({
        designerId,
        action: "update_order_status",
        entity: "order",
        entityId: id,
        details: `Status changed to "${update.status}"`,
        metadata: { newStatus: update.status, title: order.title },
      });
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
      ...(warnings.length > 0 && { warnings }),
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
/*  Soft-delete an order (preserves data for audit trail)                     */
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

    // Zero-delete policy: ONLY owners can delete orders
    const designer = await Designer.findById(designerId).select("role").lean();
    if (designer && designer.role !== "owner") {
      return NextResponse.json(
        { success: false, error: "Only the account owner (Oga) can delete orders. Use 'Request Correction' instead." },
        { status: 403 }
      );
    }

    // Soft-delete: mark as deleted instead of removing from DB
    const order = await Order.findOneAndUpdate(
      { _id: id, designerId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Audit log
    logActivity({
      designerId,
      action: "soft_delete_order",
      entity: "order",
      entityId: id,
      details: `Soft-deleted order "${order.title}" (${order.price} ${order.currency})`,
      metadata: { title: order.title, price: order.price, status: order.status },
    });

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
