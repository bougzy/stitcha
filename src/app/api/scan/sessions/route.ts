import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { ScanSession } from "@/lib/models/scan-session";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { generateScanLink } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import { checkSubscriptionLimit } from "@/lib/subscription";

/* -------------------------------------------------------------------------- */
/*  GET /api/scan/sessions                                                     */
/*  List scan sessions for the authenticated designer                         */
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
    const status = searchParams.get("status") || "";

    await connectDB();

    // Build filter
    const filter: Record<string, unknown> = { designerId };

    if (
      status &&
      ["pending", "processing", "completed", "failed", "expired"].includes(status)
    ) {
      filter.status = status;
    }

    // Mark expired sessions
    await ScanSession.updateMany(
      {
        designerId,
        status: "pending",
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: "expired" } }
    );

    const sessions = await ScanSession.find(filter)
      .populate("clientId", "name phone email gender")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Transform for the frontend
    const transformed = sessions.map((s) => {
      // Handle populated client or missing client (quick scan)
      let clientId: string | null = null;
      let client: { name: string; phone?: string; email?: string; gender?: string } | null = null;

      if (s.clientId) {
        if (typeof s.clientId === "object" && s.clientId !== null && "_id" in s.clientId) {
          clientId = (s.clientId as { _id: { toString: () => string } })._id.toString();
          if ("name" in s.clientId) {
            client = s.clientId as { name: string; phone?: string; email?: string; gender?: string };
          }
        } else {
          clientId = s.clientId.toString();
        }
      }

      // For quick scans without a client, show guest info
      if (!client && (s.guestName || !s.clientId)) {
        client = {
          name: s.guestName || "Quick Scan",
          phone: s.guestPhone || undefined,
        };
      }

      return {
        _id: s._id.toString(),
        designerId: s.designerId.toString(),
        clientId,
        client,
        isQuickScan: !s.clientId,
        guestName: s.guestName || null,
        guestPhone: s.guestPhone || null,
        linkCode: s.linkCode,
        status: s.status,
        measurements: s.measurements || null,
        scanUrl: `${APP_URL}/scan/${s.linkCode}`,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(transformed)),
    });
  } catch (error) {
    console.error("GET /api/scan/sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/scan/sessions                                                    */
/*  Generate a new scan session for a client                                  */
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
    const { clientId } = body;

    await connectDB();

    // Check subscription limit for creating scans
    const designerDoc = await Designer.findById(designerId).select("subscription").lean();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const scanCount = await ScanSession.countDocuments({ designerId, createdAt: { $gte: startOfMonth } });
    const check = checkSubscriptionLimit(designerDoc?.subscription || "free", "create_scan", scanCount);
    if (!check.allowed) {
      return NextResponse.json(
        { success: false, error: check.message },
        { status: 403 }
      );
    }

    // If a clientId is provided, verify it belongs to this designer
    let client: { name: string; phone?: string } | null = null;
    if (clientId) {
      const clientDoc = await Client.findOne({ _id: clientId, designerId }).lean();
      if (!clientDoc) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 }
        );
      }
      client = clientDoc as { name: string; phone?: string };
    }

    // Fetch designer info for the scan page
    const designer = await Designer.findById(designerId).select("name businessName").lean();
    if (!designer) {
      return NextResponse.json(
        { success: false, error: "Designer not found" },
        { status: 404 }
      );
    }

    // Generate a unique link code
    let linkCode = generateScanLink();
    let attempts = 0;
    while (await ScanSession.findOne({ linkCode })) {
      linkCode = generateScanLink();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { success: false, error: "Failed to generate unique link code" },
          { status: 500 }
        );
      }
    }

    // Expire any existing pending sessions for this client (only if client provided)
    if (clientId) {
      await ScanSession.updateMany(
        { clientId, designerId, status: "pending" },
        { $set: { status: "expired" } }
      );
    }

    // Create the scan session with 24-hour expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData: Record<string, any> = {
      designerId,
      linkCode,
      status: "pending",
      expiresAt,
    };
    if (clientId) {
      sessionData.clientId = clientId;
    }

    const scanSession = await ScanSession.create(sessionData);

    const scanUrl = `${APP_URL}/scan/${linkCode}`;

    return NextResponse.json(
      {
        success: true,
        message: "Scan link generated successfully",
        data: {
          _id: scanSession._id.toString(),
          designerId,
          clientId: clientId || null,
          clientName: client?.name || "Quick Scan",
          designerName: (designer as { name: string }).name,
          businessName: (designer as { businessName: string }).businessName,
          linkCode,
          status: "pending",
          scanUrl,
          expiresAt: expiresAt.toISOString(),
          createdAt: scanSession.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/scan/sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
