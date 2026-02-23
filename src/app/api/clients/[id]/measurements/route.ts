import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { measurementSchema } from "@/lib/validations";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/[id]/measurements                                        */
/*  Get measurement history for a client                                      */
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

    const client = await Client.findOne(
      { _id: id, designerId },
      { measurements: 1, measurementHistory: 1, lastMeasuredAt: 1 }
    ).lean();

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        current: client.measurements || null,
        history: client.measurementHistory || [],
        lastMeasuredAt: client.lastMeasuredAt || null,
      },
    });
  } catch (error) {
    console.error("GET /api/clients/[id]/measurements error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/clients/[id]/measurements                                       */
/*  Save new measurements (manual entry)                                      */
/* -------------------------------------------------------------------------- */

export async function POST(
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

    // Validate measurement data
    const parsed = measurementSchema.safeParse(body);
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

    // Verify client ownership
    const client = await Client.findOne({ _id: id, designerId });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Build measurement record with only defined values
    const measurementData: Record<string, unknown> = {
      source: "manual",
      measuredAt: now,
    };

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined && value !== null && !isNaN(value as number)) {
        measurementData[key] = value;
      }
    }

    // Push current measurements to history (if they exist) and set new ones
    if (client.measurements) {
      client.measurementHistory.push(client.measurements);
    }

    client.measurements = measurementData;
    client.lastMeasuredAt = now;

    await client.save();

    return NextResponse.json(
      {
        success: true,
        message: "Measurements saved successfully",
        data: {
          current: JSON.parse(JSON.stringify(client.measurements)),
          lastMeasuredAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/clients/[id]/measurements error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
