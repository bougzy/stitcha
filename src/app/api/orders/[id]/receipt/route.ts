import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/orders/[id]/receipt                                               */
/*  Returns order receipt data for PDF generation on the client                */
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

    const order = await Order.findOne({ _id: id, designerId }).lean();
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const [client, designer] = await Promise.all([
      Client.findById(order.clientId).lean(),
      Designer.findById(designerId).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        order: JSON.parse(JSON.stringify(order)),
        client: client
          ? {
              name: (client as { name: string }).name,
              phone: (client as { phone: string }).phone,
              email: (client as { email?: string }).email,
            }
          : null,
        designer: designer
          ? {
              name: (designer as { name: string }).name,
              businessName: (designer as { businessName?: string }).businessName,
              phone: (designer as { phone?: string }).phone,
              email: (designer as { email: string }).email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id]/receipt error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
