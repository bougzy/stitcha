import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/export                                                    */
/*  Export all clients as CSV for the authenticated designer                  */
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

    const clients = await Client.find({ designerId })
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = ["Name", "Phone", "Email", "Gender", "Last Measured", "Created"];
    const rows = clients.map((client) => {
      const c = client as Record<string, unknown>;
      return [
        escapeCsv(String(c.name || "")),
        escapeCsv(String(c.phone || "")),
        escapeCsv(String(c.email || "")),
        escapeCsv(String(c.gender || "")),
        escapeCsv(c.lastMeasuredAt ? formatDate(c.lastMeasuredAt as Date) : ""),
        escapeCsv(c.createdAt ? formatDate(c.createdAt as Date) : ""),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="clients-export.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/clients/export error:", error);
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
