import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ActivityLog } from "@/lib/models/activity-log";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = session.user.id;
    const { searchParams } = new URL(request.url);

    const entity = searchParams.get("entity") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    await dbConnect();

    const filter: Record<string, unknown> = { designerId };
    if (entity) filter.entity = entity;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs: JSON.parse(JSON.stringify(logs)),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load activity log" },
      { status: 500 }
    );
  }
}
