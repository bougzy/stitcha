import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Notification } from "@/lib/models/notification";
import { ActivityLog } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/designers/[id]/suspend                                     */
/*  Body: { suspended: boolean, reason?: string }                              */
/*                                                                              */
/*  Toggles `Designer.suspended`. Suspended designers can still log in but    */
/*  are blocked from sending broadcasts, generating scan links, or creating  */
/*  new orders (callers must check designer.suspended before allowing those  */
/*  operations).                                                                */
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
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const body = (await request.json()) as { suspended?: boolean; reason?: string };
    const suspended = body.suspended === true;
    const reason = (body.reason || "").trim().slice(0, 500);

    if (suspended && (!reason || reason.length < 3)) {
      return NextResponse.json(
        { success: false, error: "Add a reason — it's stored on the record." },
        { status: 400 },
      );
    }

    await connectDB();

    const update: Record<string, unknown> = suspended
      ? { suspended: true, suspendedAt: new Date(), suspendedReason: reason }
      : { suspended: false, suspendedReason: null };

    const designer = await Designer.findByIdAndUpdate(id, update, { new: true })
      .select("name suspended");
    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer not found" }, { status: 404 });
    }

    await ActivityLog.create({
      designerId: id,
      action: suspended ? "admin_suspended" : "admin_unsuspended",
      entity: "settings",
      details: suspended ? `Suspended by admin — ${reason}` : "Unsuspended by admin",
      metadata: { reason, source: "admin" },
    });

    Notification.create({
      designerId: id,
      type: "system",
      title: suspended ? "⚠️ Account suspended" : "✅ Account restored",
      message: suspended
        ? `Your Stitcha account has been temporarily restricted: ${reason}. Contact support to resolve.`
        : "Your Stitcha account has been restored. You can resume normal use.",
      link: "/dashboard",
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ success: true, data: { suspended: !!designer.suspended } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
