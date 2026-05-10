import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { BroadcastJob } from "@/lib/models/broadcast-job";
import { loadDesignerForAction } from "@/lib/access-control";

/* -------------------------------------------------------------------------- */
/*  /api/broadcast/schedule                                                    */
/*                                                                              */
/*  POST — schedule a broadcast for the future                                 */
/*    Body: { recipientIds, message, segment, language, channel, scheduledFor }
/*    Snapshots the recipient list NOW so segment changes later don't change  */
/*    who gets the message.                                                    */
/*                                                                              */
/*  GET  — list the current designer's pending broadcasts                      */
/* -------------------------------------------------------------------------- */

const MAX_RECIPIENTS = 200;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      recipientIds?: string[];
      message?: string;
      segment?: string;
      language?: "english" | "pidgin";
      channel?: "sms" | "whatsapp";
      scheduledFor?: string;
    };

    const recipientIds = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((id) => Types.ObjectId.isValid(id))
      : [];
    const message = (body.message || "").trim();
    const channel = body.channel === "whatsapp" ? "whatsapp" : "sms";
    const language = body.language === "pidgin" ? "pidgin" : "english";
    const segment = (body.segment || "all").trim();
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

    if (recipientIds.length === 0) {
      return NextResponse.json({ success: false, error: "No recipients" }, { status: 400 });
    }
    if (recipientIds.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_RECIPIENTS} recipients per broadcast.` },
        { status: 400 },
      );
    }
    if (!message || message.length < 5 || message.length > 480) {
      return NextResponse.json(
        { success: false, error: "Message must be 5-480 characters." },
        { status: 400 },
      );
    }
    if (!scheduledFor || isNaN(scheduledFor.getTime())) {
      return NextResponse.json({ success: false, error: "scheduledFor is required." }, { status: 400 });
    }
    // Must be at least 5 minutes in the future
    if (scheduledFor.getTime() < Date.now() + 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "Schedule at least 5 minutes from now." },
        { status: 400 },
      );
    }

    await connectDB();

    const gate = await loadDesignerForAction(userId);
    if (!gate.ok) {
      return NextResponse.json(
        { success: false, error: gate.message, suspended: gate.reason === "suspended" },
        { status: gate.status },
      );
    }

    // Snapshot recipient names + phones so a renamed/deleted client later
    // doesn't break the scheduled send.
    const clients = await Client.find({
      designerId: userId,
      _id: { $in: recipientIds },
    })
      .select("name phone")
      .lean();
    if (clients.length === 0) {
      return NextResponse.json({ success: false, error: "No valid recipients" }, { status: 400 });
    }

    const job = await BroadcastJob.create({
      designerId: userId,
      segment,
      message,
      language,
      channel,
      scheduledFor,
      status: "pending",
      recipients: clients.map((c) => {
        const cc = c as unknown as { _id: Types.ObjectId; name?: string; phone?: string };
        return {
          clientId: cc._id,
          name: cc.name || "",
          phone: cc.phone || "",
        };
      }),
      recipientCount: clients.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: String((job as unknown as { _id: Types.ObjectId })._id),
        scheduledFor: scheduledFor.toISOString(),
        recipientCount: clients.length,
        channel,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const jobs = await BroadcastJob.find({
      designerId: userId,
      status: { $in: ["pending", "ready"] },
    })
      .sort({ scheduledFor: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map((j) => {
          const jj = j as unknown as Record<string, unknown>;
          return {
            id: String(jj._id),
            segment: jj.segment,
            channel: jj.channel,
            language: jj.language,
            messagePreview: ((jj.message as string) || "").slice(0, 120),
            scheduledFor: jj.scheduledFor,
            recipientCount: jj.recipientCount ?? 0,
            sentCount: jj.sentCount ?? 0,
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
