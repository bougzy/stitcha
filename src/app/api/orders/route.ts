import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { orderSchema } from "@/lib/validations";
import { logActivity } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  GET /api/orders                                                           */
/*  List all orders for the authenticated designer                           */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("clientId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    await connectDB();

    // Build filter (exclude soft-deleted orders)
    const filter: Record<string, unknown> = { designerId, isDeleted: { $ne: true } };

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (status) {
      // Support comma-separated statuses (e.g., "cutting,sewing,fitting,finishing")
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    if (clientId) {
      filter.clientId = clientId;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("clientId", "name phone email gender")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Transform populated clientId to client field
    const transformedOrders = orders.map((order) => {
      const { clientId: clientData, ...rest } = order as Record<string, unknown>;
      return {
        ...rest,
        clientId: clientData && typeof clientData === "object" && "_id" in clientData
          ? (clientData as { _id: string })._id
          : clientData,
        client: clientData && typeof clientData === "object" && "name" in clientData
          ? clientData
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        orders: JSON.parse(JSON.stringify(transformedOrders)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/orders                                                          */
/*  Create a new order                                                        */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();

    // Validate input
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the client belongs to this designer
    const client = await Client.findOne({
      _id: parsed.data.clientId,
      designerId,
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found or does not belong to you" },
        { status: 404 }
      );
    }

    const initialDeposit = parsed.data.depositPaid || 0;
    const payments = initialDeposit > 0
      ? [{ amount: initialDeposit, method: "cash", paidAt: new Date() }]
      : [];

    const order = await Order.create({
      ...parsed.data,
      designerId,
      status: "pending",
      statusHistory: [{ status: "pending", changedAt: new Date() }],
      currency: "NGN",
      depositPaid: initialDeposit,
      payments,
      paymentStatus: initialDeposit >= parsed.data.price
        ? "paid"
        : initialDeposit > 0
        ? "partial"
        : "unpaid",
    });

    // Increment lifetime order counter
    await Designer.findByIdAndUpdate(designerId, {
      $inc: { "lifetimeCounts.totalOrdersCreated": 1 },
    });

    // Audit log
    logActivity({
      designerId,
      action: "create_order",
      entity: "order",
      entityId: order._id.toString(),
      details: `Created order "${parsed.data.title}" for ${parsed.data.price} NGN`,
      metadata: { title: parsed.data.title, price: parsed.data.price, clientId: parsed.data.clientId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully",
        data: JSON.parse(JSON.stringify(order)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
