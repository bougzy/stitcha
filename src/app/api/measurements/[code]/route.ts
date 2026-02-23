import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/measurements/[code]                                              */
/*  Public endpoint — returns measurement card data for a share code          */
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
        { success: false, error: "Measurement card not found" },
        { status: 404 }
      );
    }

    // Fetch designer info (business name only)
    const designer = await Designer.findById(client.designerId)
      .select("businessName name city state")
      .lean();

    // Only return public-safe data
    return NextResponse.json({
      success: true,
      data: {
        clientName: client.name,
        clientGender: client.gender,
        measurements: client.measurements || null,
        lastMeasuredAt: client.lastMeasuredAt || null,
        designer: designer
          ? {
              businessName: (designer as Record<string, unknown>).businessName,
              name: (designer as Record<string, unknown>).name,
              location: [
                (designer as Record<string, unknown>).city,
                (designer as Record<string, unknown>).state,
              ]
                .filter(Boolean)
                .join(", "),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/measurements/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
