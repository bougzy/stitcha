import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { clientSchema } from "@/lib/validations";
import { checkSubscriptionLimit } from "@/lib/subscription";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients                                                          */
/*  List all clients for the authenticated designer                           */
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
    const gender = searchParams.get("gender") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    await connectDB();

    // Build filter
    const filter: Record<string, unknown> = { designerId };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (gender && (gender === "male" || gender === "female")) {
      filter.gender = gender;
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        clients: JSON.parse(JSON.stringify(clients)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/clients                                                         */
/*  Create a new client                                                       */
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
    const parsed = clientSchema.safeParse(body);
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

    // Check subscription limit for creating clients
    const designer = await Designer.findById(designerId).select("subscription").lean();
    const clientCount = await Client.countDocuments({ designerId });
    const check = checkSubscriptionLimit(designer?.subscription || "free", "create_client", clientCount);
    if (!check.allowed) {
      return NextResponse.json(
        { success: false, error: check.message },
        { status: 403 }
      );
    }

    const client = await Client.create({
      ...parsed.data,
      designerId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Client created successfully",
        data: JSON.parse(JSON.stringify(client)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
