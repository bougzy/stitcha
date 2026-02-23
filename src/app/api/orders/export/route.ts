import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/orders/export                                                     */
/*  Export all orders as CSV for the authenticated designer                   */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;

    await connectDB();

    const orders = await Order.find({ designerId })
      .populate("clientId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = [
      "Title",
      "Client",
      "Garment Type",
      "Status",
      "Price",
      "Deposit",
      "Balance",
      "Due Date",
      "Created",
    ];

    const rows = orders.map((order) => {
      const o = order as Record<string, unknown>;
      const clientName =
        o.clientId && typeof o.clientId === "object" && "name" in (o.clientId as Record<string, unknown>)
          ? String((o.clientId as { name: string }).name)
          : "";
      const price = Number(o.price) || 0;
      const deposit = Number(o.depositPaid) || 0;
      const balance = price - deposit;

      return [
        escapeCsv(String(o.title || "")),
        escapeCsv(clientName),
        escapeCsv(String(o.garmentType || "")),
        escapeCsv(String(o.status || "")),
        escapeCsv(String(price)),
        escapeCsv(String(deposit)),
        escapeCsv(String(balance)),
        escapeCsv(o.dueDate ? formatDate(o.dueDate as Date) : ""),
        escapeCsv(o.createdAt ? formatDate(o.createdAt as Date) : ""),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="orders-export.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/orders/export error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date): string {
  return new Date(date).toISOString().split("T")[0];
}
