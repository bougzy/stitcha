import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  GET /api/broadcast/schedule/[id] — full job with recipients (for resume)   */
/* -------------------------------------------------------------------------- */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const job = await BroadcastJob.findOne({ _id: id, designerId: userId }).lean();
    if (!job) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const j = job as unknown as Record<string, unknown>;
    const recipients = (j.recipients as Array<Record<string, unknown>>) || [];

    return NextResponse.json({
      success: true,
      data: {
        id: String(j._id),
        segment: j.segment,
        channel: j.channel,
        language: j.language,
        message: j.message,
        scheduledFor: j.scheduledFor ?? null,
        status: j.status,
        recipientCount: j.recipientCount ?? 0,
        sentCount: j.sentCount ?? 0,
        failedCount: j.failedCount ?? 0,
        recipients: recipients.map((r) => ({
          _id: String(r.clientId),
          name: r.name as string,
          phone: r.phone as string,
          gender: "",
          sent: !!r.sent,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/broadcast/schedule/[id] — cancel a pending broadcast           */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    // Only pending or ready jobs can be cancelled — running / complete are immutable.
    const job = await BroadcastJob.findOneAndUpdate(
      { _id: id, designerId: userId, status: { $in: ["pending", "ready"] } },
      { $set: { status: "cancelled", completedAt: new Date() } },
      { new: true },
    );
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Broadcast not found or already running" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
