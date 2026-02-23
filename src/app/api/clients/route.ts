import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { clientSchema } from "@/lib/validations";
import { checkSubscriptionLimit } from "@/lib/subscription";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

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

    const [clients, total, designer] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(filter),
      Designer.findById(designerId).select("subscription lifetimeCounts").lean(),
    ]);

    // Include usage info for the Usage Bar
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === (designer?.subscription || "free")) || SUBSCRIPTION_PLANS[0];
    const lifetimeUsed = designer?.lifetimeCounts?.totalClientsCreated ?? total;

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
        usage: {
          lifetimeClientsCreated: lifetimeUsed,
          clientLimit: plan.clientLimit,
          planName: plan.name,
          subscription: designer?.subscription || "free",
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

    // Check subscription limit using LIFETIME count (non-decreasing, prevents delete-and-recreate gaming)
    const designer = await Designer.findById(designerId).select("subscription role lifetimeCounts").lean();
    const lifetimeClients = designer?.lifetimeCounts?.totalClientsCreated ?? 0;
    const currentCount = await Client.countDocuments({ designerId });
    const check = checkSubscriptionLimit(
      designer?.subscription || "free",
      "create_client",
      currentCount,
      lifetimeClients
    );
    if (!check.allowed) {
      return NextResponse.json(
        { success: false, error: check.message, lifetimeCount: lifetimeClients },
        { status: 403 }
      );
    }

    // Atomically increment lifetime counter AND create client
    await Designer.findByIdAndUpdate(designerId, {
      $inc: { "lifetimeCounts.totalClientsCreated": 1 },
    });

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
