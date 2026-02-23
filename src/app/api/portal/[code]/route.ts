import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/portal/[code]                                                    */
/*  Public endpoint — returns full client portal data (measurements + orders) */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    await connectDB();

    const client = await Client.findOne({ shareCode: code }).lean();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Portal not found" },
        { status: 404 }
      );
    }

    // Fetch designer info
    const designer = await Designer.findById(client.designerId)
      .select("businessName name phone city state")
      .lean();

    // Fetch orders for this client (only non-cancelled, public-safe fields)
    const orders = await Order.find({
      clientId: client._id,
      status: { $ne: "cancelled" },
    })
      .select("title garmentType status statusHistory dueDate createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const d = designer as Record<string, unknown> | null;

    return NextResponse.json({
      success: true,
      data: {
        clientName: client.name,
        clientGender: client.gender,
        measurements: client.measurements || null,
        lastMeasuredAt: client.lastMeasuredAt || null,
        designer: d
          ? {
              businessName: d.businessName,
              name: d.name,
              phone: d.phone,
              location: [d.city, d.state].filter(Boolean).join(", "),
            }
          : null,
        orders: orders.map((o) => {
          const order = o as Record<string, unknown>;
          return {
            _id: String(order._id),
            title: order.title,
            garmentType: order.garmentType,
            status: order.status,
            dueDate: order.dueDate
              ? new Date(order.dueDate as Date).toISOString()
              : null,
            statusHistory: Array.isArray(order.statusHistory)
              ? (order.statusHistory as { status: string; changedAt: Date; note?: string }[]).map(
                  (h) => ({
                    status: h.status,
                    changedAt: new Date(h.changedAt).toISOString(),
                    note: h.note,
                  })
                )
              : [],
            createdAt: new Date(order.createdAt as Date).toISOString(),
            updatedAt: new Date(order.updatedAt as Date).toISOString(),
          };
        }),
      },
    });
  } catch (error) {
    console.error("GET /api/portal/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
