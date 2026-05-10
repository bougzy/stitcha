import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { AdminNotification } from "@/lib/models/admin-notification";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/notifications/[id]/read     — mark one read                */
/*  POST /api/admin/notifications/[id]/read?all=1 — mark all read              */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1" || id === "all";

    await connectDB();

    if (all) {
      const r = await AdminNotification.updateMany(
        { read: false },
        { $set: { read: true, readAt: new Date() } },
      );
      return NextResponse.json({
        success: true,
        data: { matched: r.matchedCount, modified: r.modifiedCount },
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await AdminNotification.findByIdAndUpdate(id, {
      read: true,
      readAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
