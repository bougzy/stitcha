import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Outreach } from "@/lib/models/outreach";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  /api/broadcast/whatsapp-log                                                */
/*                                                                              */
/*  POST → "start" a new WhatsApp-queue broadcast job                          */
/*    Body: { segment, message, language, recipients: [{clientId, name, phone}] }
/*    Returns: { jobId }                                                       */
/*                                                                              */
/*  PUT  → mark a single recipient as sent in an existing job                  */
/*    Body: { jobId, clientId, message }                                       */
/*    Increments sentCount, marks the recipient sent in the snapshot, writes  */
/*    an Outreach row, and flips status to "complete" once the queue is done. */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      segment?: string;
      message?: string;
      language?: "english" | "pidgin";
      recipients?: { clientId: string; name: string; phone: string }[];
    };

    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: "No recipients" }, { status: 400 });
    }
    if (!body.message || body.message.length < 5) {
      return NextResponse.json({ success: false, error: "Message too short" }, { status: 400 });
    }

    await connectDB();

    const job = await BroadcastJob.create({
      designerId: userId,
      segment: (body.segment || "all").trim(),
      message: body.message.trim(),
      language: body.language === "pidgin" ? "pidgin" : "english",
      channel: "whatsapp",
      scheduledFor: null,
      status: "running",
      startedAt: new Date(),
      recipients: recipients
        .filter((r) => Types.ObjectId.isValid(r.clientId))
        .map((r) => ({
          clientId: new Types.ObjectId(r.clientId),
          name: r.name,
          phone: r.phone,
          sent: false,
        })),
      recipientCount: recipients.length,
    });

    return NextResponse.json({ success: true, data: { jobId: String(job._id) } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      jobId?: string;
      clientId?: string;
      message?: string;
    };
    const jobId = body.jobId;
    const clientId = body.clientId;
    if (!jobId || !Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ success: false, error: "Invalid jobId" }, { status: 400 });
    }
    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ success: false, error: "Invalid clientId" }, { status: 400 });
    }

    await connectDB();

    const job = await BroadcastJob.findOne({
      _id: jobId,
      designerId: userId,
    });
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // Idempotent — flip the recipient's `sent` flag and bump sentCount only
    // on the first successful mark.
    const recipient = job.recipients.find((r) => String(r.clientId) === clientId);
    if (recipient && !recipient.sent) {
      recipient.sent = true;
      job.sentCount = (job.sentCount || 0) + 1;
    }
    if (job.sentCount + job.failedCount >= job.recipientCount) {
      job.status = "complete";
      job.completedAt = new Date();
    }
    await job.save();

    // Engagement signal for Heartbeat (best-effort)
    Outreach.create({
      designerId: userId,
      clientId,
      type: "whatsapp",
      message: (body.message || "").slice(0, 280),
    }).catch(() => { /* ignore */ });

    return NextResponse.json({
      success: true,
      data: {
        sentCount: job.sentCount,
        recipientCount: job.recipientCount,
        status: job.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
