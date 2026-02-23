import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScanSession } from "@/lib/models/scan-session";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/scan/[code]                                                       */
/*  Public endpoint - validate scan link and return session info              */
/*  No auth required (used by clients on their mobile phone)                  */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid scan code" },
        { status: 400 }
      );
    }

    await connectDB();

    const scanSession = await ScanSession.findOne({ linkCode: code }).lean();

    if (!scanSession) {
      return NextResponse.json(
        {
          success: false,
          error: "Scan link not found",
          data: { status: "invalid" },
        },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(scanSession.expiresAt) < new Date()) {
      // Mark as expired if still pending
      if (scanSession.status === "pending") {
        await ScanSession.updateOne(
          { _id: scanSession._id },
          { $set: { status: "expired" } }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          status: "expired",
          message: "This scan link has expired. Please ask your designer for a new link.",
        },
      });
    }

    // If already completed or processing
    if (scanSession.status === "completed") {
      return NextResponse.json({
        success: true,
        data: {
          status: "completed",
          message: "Your measurements have already been recorded. Thank you!",
        },
      });
    }

    if (scanSession.status === "processing") {
      return NextResponse.json({
        success: true,
        data: {
          status: "processing",
          message: "Your photos are still being processed. Please wait...",
        },
      });
    }

    if (scanSession.status === "failed") {
      return NextResponse.json({
        success: true,
        data: {
          status: "failed",
          message: "There was an issue processing your scan. Please ask your designer for a new link.",
        },
      });
    }

    // Session is pending and valid - fetch designer and optionally client info
    const designer = await Designer.findById(scanSession.designerId)
      .select("name businessName avatar")
      .lean();

    let clientName = "";
    let clientGender = "male";
    const isQuickScan = !scanSession.clientId;

    if (scanSession.clientId) {
      const client = await Client.findById(scanSession.clientId)
        .select("name gender")
        .lean();
      if (client) {
        clientName = (client as { name: string }).name;
        clientGender = (client as { gender: string }).gender || "male";
      }
    } else if (scanSession.guestName) {
      clientName = scanSession.guestName;
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "pending",
        designerName: designer ? (designer as { name: string }).name : "Your Designer",
        businessName: designer ? (designer as { businessName: string }).businessName : "",
        clientName,
        clientGender,
        isQuickScan,
        expiresAt: scanSession.expiresAt,
      },
    });
  } catch (error) {
    console.error("GET /api/scan/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/scan/[code]                                                      */
/*  Public endpoint - Upload scan photos (placeholder for AI processing)      */
/*  No auth required (used by clients on their mobile phone)                  */
/* -------------------------------------------------------------------------- */

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid scan code" },
        { status: 400 }
      );
    }

    await connectDB();

    const scanSession = await ScanSession.findOne({ linkCode: code });

    if (!scanSession) {
      return NextResponse.json(
        { success: false, error: "Scan link not found" },
        { status: 404 }
      );
    }

    // Validate session state
    if (scanSession.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `This scan session is ${scanSession.status}. Cannot process photos.`,
        },
        { status: 400 }
      );
    }

    if (new Date(scanSession.expiresAt) < new Date()) {
      await ScanSession.updateOne(
        { _id: scanSession._id },
        { $set: { status: "expired" } }
      );
      return NextResponse.json(
        { success: false, error: "This scan link has expired." },
        { status: 400 }
      );
    }

    // Parse measurements from request body
    const body = await _request.json();
    const { measurements, confidence, heightCm, guestName, guestPhone, guestGender } = body;

    // Validate measurements is an object with numeric values
    if (!measurements || typeof measurements !== "object" || Array.isArray(measurements)) {
      return NextResponse.json(
        { success: false, error: "Invalid measurements: must be an object with numeric values" },
        { status: 400 }
      );
    }

    const numericMeasurements: Record<string, number> = {};
    for (const [key, value] of Object.entries(measurements)) {
      if (typeof value !== "number" || isNaN(value)) {
        return NextResponse.json(
          { success: false, error: `Invalid measurement value for "${key}": must be a number` },
          { status: 400 }
        );
      }
      numericMeasurements[key] = value;
    }

    // If heightCm is provided, include it
    if (heightCm !== undefined) {
      if (typeof heightCm !== "number" || isNaN(heightCm)) {
        return NextResponse.json(
          { success: false, error: "Invalid heightCm: must be a number" },
          { status: 400 }
        );
      }
      numericMeasurements.height = heightCm;
    }

    const now = new Date();
    const measurementConfidence = typeof confidence === "number" && !isNaN(confidence) ? confidence : 0.85;

    // For quick scans without a client, auto-create a client from guest info
    if (!scanSession.clientId && guestName && guestPhone) {
      const newClient = await Client.create({
        designerId: scanSession.designerId,
        name: guestName.trim(),
        phone: guestPhone.trim(),
        gender: guestGender === "female" ? "female" : "male",
        measurements: {
          ...numericMeasurements,
          source: "ai_scan",
          confidence: measurementConfidence,
          measuredAt: now,
        },
        measurementHistory: [{
          ...numericMeasurements,
          source: "ai_scan",
          confidence: measurementConfidence,
          measuredAt: now,
        }],
        lastMeasuredAt: now,
      });

      // Link the new client to this scan session
      scanSession.clientId = newClient._id;
      scanSession.guestName = guestName.trim();
      scanSession.guestPhone = guestPhone.trim();
    } else if (scanSession.clientId) {
      // Update existing client's measurements
      await Client.updateOne(
        { _id: scanSession.clientId },
        {
          $set: {
            measurements: {
              ...numericMeasurements,
              source: "ai_scan",
              confidence: measurementConfidence,
              measuredAt: now,
            },
            lastMeasuredAt: now,
          },
          $push: {
            measurementHistory: {
              ...numericMeasurements,
              source: "ai_scan",
              confidence: measurementConfidence,
              measuredAt: now,
            },
          },
        }
      );
    }

    // Update scan session to completed with measurements
    scanSession.status = "completed";
    scanSession.measurements = numericMeasurements;
    await scanSession.save();

    return NextResponse.json({
      success: true,
      message: "Measurements saved successfully",
      data: {
        status: "completed",
        sessionId: scanSession._id.toString(),
        measurements: numericMeasurements,
      },
    });
  } catch (error) {
    console.error("POST /api/scan/[code] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
