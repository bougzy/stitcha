import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { ActivityLog } from "@/lib/models/activity-log";
import { Designer } from "@/lib/models/designer";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
    const entity = searchParams.get("entity") || "";
    const designerId = searchParams.get("designerId") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (entity) filter.entity = entity;
    if (designerId) filter.designerId = designerId;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    // Fetch designer names for the logs
    const designerIds = [...new Set(logs.map((l) => l.designerId.toString()))];
    const designers = await Designer.find(
      { _id: { $in: designerIds } },
      { name: 1, email: 1, businessName: 1 }
    ).lean();
    const designerMap = new Map(
      designers.map((d) => [d._id.toString(), d])
    );

    const enrichedLogs = logs.map((log) => ({
      ...log,
      designer: designerMap.get(log.designerId.toString()) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: JSON.parse(JSON.stringify(enrichedLogs)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin activity error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
