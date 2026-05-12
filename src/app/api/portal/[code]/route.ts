import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/portal/[code]                                                    */
/*  Public — full client portal data (measurements + orders + payment        */
/*  summary + notify-when-ready flag).                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    await connectDB();

    const client = await Client.findOne({ shareCode: code }).lean();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Portal not found" },
        { status: 404 },
      );
    }

    const designer = await Designer.findById(client.designerId)
      .select("businessName name phone city state")
      .lean();

    const orders = await Order.find({
      clientId: client._id,
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true },
    })
      .select(
        "title garmentType status statusHistory dueDate createdAt updatedAt " +
          "price currency depositPaid payments paymentStatus notifyWhenReady",
      )
      .sort({ createdAt: -1 })
      .lean();

    const d = designer as Record<string, unknown> | null;

    return NextResponse.json({
      success: true,
      data: {
        clientName: client.name,
        clientGender: client.gender,
        clientPhone: client.phone,
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
          const payments =
            (order.payments as Array<Record<string, unknown>> | undefined) ?? [];
          const paymentsTotal = payments.reduce(
            (s, p) => s + ((p.amount as number) || 0),
            0,
          );
          const depositPaid = (order.depositPaid as number) || 0;
          // Total paid = deposit + sum of additional payments
          const totalPaid = depositPaid + paymentsTotal;
          const price = (order.price as number) || 0;
          const balance = Math.max(0, price - totalPaid);
          return {
            _id: String(order._id),
            title: order.title,
            garmentType: order.garmentType,
            status: order.status,
            dueDate: order.dueDate
              ? new Date(order.dueDate as Date).toISOString()
              : null,
            statusHistory: Array.isArray(order.statusHistory)
              ? (
                  order.statusHistory as {
                    status: string;
                    changedAt: Date;
                    note?: string;
                  }[]
                ).map((h) => ({
                  status: h.status,
                  changedAt: new Date(h.changedAt).toISOString(),
                  note: h.note,
                }))
              : [],
            createdAt: new Date(order.createdAt as Date).toISOString(),
            updatedAt: new Date(order.updatedAt as Date).toISOString(),
            // New: payment summary + notify-me toggle
            price,
            currency: (order.currency as string) || "NGN",
            totalPaid,
            balance,
            paymentStatus: (order.paymentStatus as string) || "unpaid",
            notifyWhenReady: !!order.notifyWhenReady,
          };
        }),
      },
    });
  } catch (error) {
    console.error("GET /api/portal/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/portal/[code]                                                    */
/*  Public — customer toggles the "notify me when ready" flag on one of      */
/*  their own orders. No auth — gated by knowing the shareCode AND the orderId
 *  (the customer can only see their own orders, so the orderId is implicit).
 *                                                                              */
/*  Body: { orderId: string, notifyWhenReady: boolean }                       */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = (await request.json()) as {
      orderId?: string;
      notifyWhenReady?: boolean;
    };
    const orderId = body.orderId;
    if (!orderId || !Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "Invalid orderId" },
        { status: 400 },
      );
    }

    await connectDB();

    // Validate that the order belongs to the client identified by shareCode.
    const client = await Client.findOne({ shareCode: code }).select("_id").lean();
    if (!client) {
      return NextResponse.json({ success: false, error: "Portal not found" }, { status: 404 });
    }
    const order = await Order.findOne({
      _id: orderId,
      clientId: client._id,
      isDeleted: { $ne: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    order.notifyWhenReady = !!body.notifyWhenReady;
    // Reset the "already-sent" stamp if they re-opt-in
    if (order.notifyWhenReady) order.notifyReadySentAt = undefined;
    await order.save();

    return NextResponse.json({
      success: true,
      data: { notifyWhenReady: order.notifyWhenReady },
    });
  } catch (error) {
    console.error("POST /api/portal/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
