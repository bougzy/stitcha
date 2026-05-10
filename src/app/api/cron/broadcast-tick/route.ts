import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Outreach } from "@/lib/models/outreach";
import { Notification } from "@/lib/models/notification";
import { BroadcastJob } from "@/lib/models/broadcast-job";
import { sendSMS } from "@/lib/sms";

/* -------------------------------------------------------------------------- */
/*  GET /api/cron/broadcast-tick                                               */
/*                                                                              */
/*  Vercel Cron calls this every minute. For every broadcast whose            */
/*  scheduledFor <= now and status === "pending", we either:                  */
/*                                                                              */
/*    SMS channel  → atomically deduct credits, dispatch to Termii, refund    */
/*                   on failure, mark job complete.                            */
/*    WA channel   → flip to "ready" and create a Notification telling the    */
/*                   designer to open the in-app queue. (We can't send wa.me  */
/*                   from a server.)                                           */
/*                                                                              */
/*  Auth: header `x-cron-secret: $CRON_SECRET` OR Vercel's auto-attached       */
/*  Authorization header. If neither matches, returns 401.                    */
/* -------------------------------------------------------------------------- */

const MAX_PER_TICK = 10; // safety cap so a backlog doesn't take down the worker

export async function GET(request: Request) {
  // Auth: support both Vercel's signed cron header and a manual secret.
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization") || "";
  const looksLikeVercel = auth.startsWith("Bearer ") && cronSecret && auth.endsWith(cronSecret);
  const matchesHeader = cronSecret && headerSecret === cronSecret;
  if (cronSecret && !looksLikeVercel && !matchesHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const due = await BroadcastJob.find({
      status: "pending",
      scheduledFor: { $ne: null, $lte: now },
    })
      .sort({ scheduledFor: 1 })
      .limit(MAX_PER_TICK);

    const summary = {
      processed: 0,
      smsCompleted: 0,
      waReady: 0,
      cancelled: 0,
      errors: [] as { jobId: string; error: string }[],
    };

    for (const job of due) {
      summary.processed++;
      try {
        if (job.channel === "whatsapp") {
          /* WhatsApp queue path — designer must finish manually in-app */
          job.status = "ready";
          job.startedAt = new Date();
          await job.save();
          summary.waReady++;

          await Notification.create({
            designerId: job.designerId,
            type: "system",
            title: `📣 Broadcast ready to send`,
            message: `${job.recipientCount} WhatsApp message${job.recipientCount === 1 ? "" : "s"} are queued. Open the broadcast page to send them now.`,
            link: `/broadcast?resume=${job._id}`,
          }).catch(() => { /* non-fatal */ });
          continue;
        }

        /* SMS path — server actually dispatches */
        const required = job.recipientCount;
        const reserved = await Designer.findOneAndUpdate(
          { _id: job.designerId, smsBalance: { $gte: required } },
          { $inc: { smsBalance: -required } },
        );
        if (!reserved) {
          job.status = "cancelled";
          job.completedAt = new Date();
          job.errorList = [
            ...(job.errorList || []),
            {
              clientId: job.designerId,
              error: `Insufficient SMS credits (need ${required}). Broadcast cancelled.`,
            },
          ];
          await job.save();
          summary.cancelled++;
          await Notification.create({
            designerId: job.designerId,
            type: "system",
            title: "Broadcast skipped — top up SMS credits",
            message: `Your scheduled broadcast couldn't run because you don't have ${required} SMS credits. Buy a pack to retry.`,
            link: "/billing",
          }).catch(() => { /* non-fatal */ });
          continue;
        }

        job.status = "running";
        job.startedAt = new Date();
        await job.save();

        let sent = 0;
        const errorList: typeof job.errorList = [];
        for (const r of job.recipients) {
          const first = r.name.split(" ")[0] || r.name;
          const personal = job.message
            .replace(/\{\{\s*name\s*\}\}/gi, r.name)
            .replace(/\{\{\s*first_name\s*\}\}/gi, first);
          const result = await sendSMS(r.phone, personal);
          if (result.ok) {
            r.sent = true;
            sent++;
            Outreach.create({
              designerId: job.designerId,
              clientId: r.clientId,
              type: "whatsapp",
              message: personal.slice(0, 280),
            }).catch(() => { /* non-fatal */ });
          } else {
            errorList.push({
              clientId: r.clientId,
              error: result.error || "Send failed",
            });
          }
        }

        const failed = job.recipientCount - sent;
        if (failed > 0) {
          await Designer.updateOne(
            { _id: job.designerId },
            { $inc: { smsBalance: failed } },
          );
        }

        job.sentCount = sent;
        job.failedCount = failed;
        job.errorList = errorList;
        job.status = "complete";
        job.completedAt = new Date();
        await job.save();
        summary.smsCompleted++;

        await Notification.create({
          designerId: job.designerId,
          type: "system",
          title: `✅ Broadcast sent — ${sent} of ${job.recipientCount}`,
          message:
            failed > 0
              ? `${sent} SMS delivered, ${failed} failed (credits refunded).`
              : `${sent} SMS delivered. View details in broadcast history.`,
          link: "/broadcast/history",
        }).catch(() => { /* non-fatal */ });
      } catch (err) {
        summary.errors.push({
          jobId: String(job._id),
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    );
  }
}
