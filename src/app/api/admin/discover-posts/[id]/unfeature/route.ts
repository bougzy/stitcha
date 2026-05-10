import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Notification } from "@/lib/models/notification";
import { ActivityLog } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/discover-posts/[id]/unfeature                              */
/*  Body: { reason: string }                                                    */
/*                                                                              */
/*  Force-unfeature a Discover-feed post (moderation lever). Notifies the    */
/*  owning designer with the reason.                                           */
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

    const body = (await request.json()) as { reason?: string };
    const reason = (body.reason || "").trim().slice(0, 500);
    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { success: false, error: "Add a moderation reason — it's shown to the designer." },
        { status: 400 },
      );
    }

    await connectDB();
    const order = await Order.findById(id).select("designerId title featuredInFeed");
    if (!order) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (!order.featuredInFeed) {
      return NextResponse.json({ success: false, error: "Already unfeatured" }, { status: 409 });
    }

    await Order.findByIdAndUpdate(id, {
      featuredInFeed: false,
      // Don't clear boostedUntil — it'll naturally expire; that's fairer to
      // the designer if they were paying for a boost.
    });

    await ActivityLog.create({
      designerId: order.designerId,
      action: "admin_unfeature_post",
      entity: "order",
      entityId: id,
      details: `Admin removed "${order.title}" from Discover — ${reason}`,
      metadata: { reason, source: "admin" },
    });

    Notification.create({
      designerId: order.designerId,
      type: "system",
      title: "Post removed from Discover",
      message: `Your post "${order.title}" was removed from the Discover feed by an admin: ${reason}`,
      link: `/orders/${id}`,
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
