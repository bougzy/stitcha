import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Notification } from "@/lib/models/notification";
import { ActivityLog } from "@/lib/models/activity-log";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/announce                                                   */
/*                                                                              */
/*  Body: { title, message, link?, segment? }                                  */
/*    segment: "all" | "free" | "plus" | "pro"                                */
/*                                                                              */
/*  Creates a Notification per recipient designer. Cheap (in-app only) — no  */
/*  external SMS/WhatsApp cost. Designers see it in their notification bell. */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      message?: string;
      link?: string;
      segment?: "all" | "free" | "plus" | "pro";
    };

    const title = (body.title || "").trim();
    const message = (body.message || "").trim();
    const link = (body.link || "/dashboard").trim();
    const segment = body.segment || "all";

    if (!title || title.length < 3 || title.length > 120) {
      return NextResponse.json(
        { success: false, error: "Title must be 3–120 characters." },
        { status: 400 },
      );
    }
    if (!message || message.length < 5 || message.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Message must be 5–1000 characters." },
        { status: 400 },
      );
    }
    if (!["all", "free", "plus", "pro"].includes(segment)) {
      return NextResponse.json({ success: false, error: "Invalid segment" }, { status: 400 });
    }

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (segment !== "all") filter.subscription = segment;
    const recipients = await Designer.find(filter).select("_id").lean();
    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No designers match this segment." },
        { status: 400 },
      );
    }

    // Bulk insert one Notification per designer
    const docs = recipients.map((r) => ({
      designerId: (r as unknown as { _id: unknown })._id,
      type: "system" as const,
      title,
      message,
      link,
    }));
    await Notification.insertMany(docs, { ordered: false });

    await ActivityLog.create({
      designerId: recipients[0]._id, // anchor to anyone for the activity row; not designer-scoped
      action: "admin_announce",
      entity: "settings",
      details: `Announcement sent to ${recipients.length} designer${recipients.length === 1 ? "" : "s"} (${segment}): ${title}`,
      metadata: {
        title, message, link, segment,
        recipientCount: recipients.length,
        source: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      data: { recipientCount: recipients.length, segment },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
