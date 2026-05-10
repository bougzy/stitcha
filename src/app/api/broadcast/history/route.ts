import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  GET /api/broadcast/history                                                 */
/*                                                                              */
/*  Past + cancelled broadcasts for the current designer, newest first.       */
/*  Returns aggregate counters across all jobs.                                */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 1), 100);

    await connectDB();

    const jobs = await BroadcastJob.find({
      designerId: userId,
      status: { $in: ["complete", "cancelled", "running"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    /* Per-designer aggregates */
    let totalSMS = 0;
    let totalWA = 0;
    let totalReached = 0;
    for (const j of jobs) {
      const jj = j as unknown as Record<string, unknown>;
      const sent = (jj.sentCount as number) ?? 0;
      totalReached += sent;
      if (jj.channel === "sms") totalSMS += sent;
      else if (jj.channel === "whatsapp") totalWA += sent;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReached,
        totalSMS,
        totalWA,
        jobs: jobs.map((j) => {
          const jj = j as unknown as Record<string, unknown>;
          return {
            id: String(jj._id),
            segment: jj.segment,
            channel: jj.channel,
            language: jj.language,
            messagePreview: ((jj.message as string) || "").slice(0, 160),
            scheduledFor: jj.scheduledFor ?? null,
            startedAt: jj.startedAt ?? null,
            completedAt: jj.completedAt ?? null,
            createdAt: jj.createdAt,
            recipientCount: jj.recipientCount ?? 0,
            sentCount: jj.sentCount ?? 0,
            failedCount: jj.failedCount ?? 0,
            status: jj.status,
          };
        }),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
