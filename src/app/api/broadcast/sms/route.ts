import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Client } from "@/lib/models/client";
import { Outreach } from "@/lib/models/outreach";
import { BroadcastJob } from "@/lib/models/broadcast-job";
import { sendSMS } from "@/lib/sms";

/* -------------------------------------------------------------------------- */
/*  POST /api/broadcast/sms                                                    */
/*                                                                              */
/*  Body:                                                                       */
/*    { recipientIds: string[], message: string }                              */
/*                                                                              */
/*  Atomically reserves smsBalance for the batch (so a partial failure can    */
/*  refund the remainder), then sends each SMS via Termii one at a time with  */
/*  per-recipient `{{name}}` and `{{first_name}}` substitution.                */
/*                                                                              */
/*  Returns:                                                                    */
/*    { sent, failed, remainingBalance, errors: [{ clientId, error }] }       */
/* -------------------------------------------------------------------------- */

const MAX_RECIPIENTS = 200; // safety cap on batch size

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
    };
    const recipientIds = Array.isArray(body.recipientIds) ? body.recipientIds : [];
    const message = (body.message || "").trim();
    const segment = (body.segment || "all").trim();
    const language = body.language === "pidgin" ? "pidgin" : "english";

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

    await connectDB();

    const validIds = recipientIds.filter((id) => Types.ObjectId.isValid(id));
    const clients = await Client.find({
      designerId: userId,
      _id: { $in: validIds },
    })
      .select("name phone")
      .lean();

    if (clients.length === 0) {
      return NextResponse.json({ success: false, error: "No valid recipients" }, { status: 400 });
    }

    const required = clients.length;

    /* Atomic balance reservation — only proceeds if we have enough credits */
    const reserved = await Designer.findOneAndUpdate(
      { _id: userId, smsBalance: { $gte: required } },
      { $inc: { smsBalance: -required } },
      { new: false, projection: { smsBalance: 1 } },
    );
    if (!reserved) {
      const designer = await Designer.findById(userId).select("smsBalance").lean();
      const balance = ((designer as Record<string, unknown> | null)?.smsBalance as number) ?? 0;
      return NextResponse.json(
        {
          success: false,
          error: `Not enough SMS credits. You need ${required}, you have ${balance}.`,
          needsTopUp: true,
          have: balance,
          need: required,
        },
        { status: 402 },
      );
    }

    /* History row — created up front so the job lifecycle is observable */
    const job = await BroadcastJob.create({
      designerId: userId,
      segment,
      message,
      language,
      channel: "sms",
      scheduledFor: null,
      status: "running",
      startedAt: new Date(),
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

    /* Send one at a time so we can refund on individual failures */
    const errorList: { clientId: Types.ObjectId; error: string }[] = [];
    let sent = 0;

    for (const c of clients) {
      const cc = c as unknown as { _id: Types.ObjectId; name?: string; phone?: string };
      const name = cc.name || "";
      const firstName = name.split(" ")[0] || name;
      const phone = cc.phone || "";

      // Per-recipient template substitution
      const personal = message
        .replace(/\{\{\s*name\s*\}\}/gi, name)
        .replace(/\{\{\s*first_name\s*\}\}/gi, firstName);

      const result = await sendSMS(phone, personal);
      if (result.ok) {
        sent++;
        // Log outreach (best-effort, don't fail the broadcast on log errors)
        Outreach.create({
          designerId: userId,
          clientId: cc._id,
          type: "whatsapp", // existing enum doesn't have "sms"; use whatsapp as the engagement-tracking proxy
          message: personal.slice(0, 280),
        }).catch(() => { /* ignore */ });
      } else {
        errorList.push({
          clientId: cc._id as Types.ObjectId,
          error: result.error || "Send failed",
        });
      }
    }

    /* Refund credits for any messages that failed to send */
    const failed = clients.length - sent;
    if (failed > 0) {
      await Designer.updateOne({ _id: userId }, { $inc: { smsBalance: failed } });
    }

    /* Close out the history row */
    await BroadcastJob.findByIdAndUpdate(job._id, {
      status: "complete",
      sentCount: sent,
      failedCount: failed,
      errorList,
      completedAt: new Date(),
    });

    const after = await Designer.findById(userId).select("smsBalance").lean();
    const remaining = ((after as unknown as Record<string, unknown> | null)?.smsBalance as number) ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        sent,
        failed,
        remainingBalance: remaining,
        errors: errorList.map((e) => ({ clientId: String(e.clientId), error: e.error })),
        jobId: String(job._id),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Broadcast failed" },
      { status: 500 },
    );
  }
}
