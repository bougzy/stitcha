import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { AdminNotification } from "@/lib/models/admin-notification";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/notifications?since=ISO&unread=1                            */
/*    since   — return only items created after this timestamp (used by the   */
/*              poller to detect "new since last check")                       */
/*    unread  — restrict to unread items                                       */
/*    limit   — page size (default 30, max 100)                                */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sinceRaw = searchParams.get("since");
    const onlyUnread = searchParams.get("unread") === "1";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 1), 100);

    const filter: Record<string, unknown> = {};
    if (onlyUnread) filter.read = false;
    if (sinceRaw) {
      const since = new Date(sinceRaw);
      if (!isNaN(since.getTime())) filter.createdAt = { $gt: since };
    }

    const [items, unreadCount, actionRequiredCount] = await Promise.all([
      AdminNotification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      AdminNotification.countDocuments({ read: false }),
      AdminNotification.countDocuments({ read: false, severity: "action_required" }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((it) => {
          const i = it as unknown as Record<string, unknown>;
          return {
            id: String(i._id),
            kind: i.kind,
            severity: i.severity,
            title: i.title,
            message: i.message,
            link: i.link,
            meta: i.meta,
            designerId: i.designerId ? String(i.designerId) : null,
            read: !!i.read,
            createdAt: i.createdAt,
          };
        }),
        unreadCount,
        actionRequiredCount,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
