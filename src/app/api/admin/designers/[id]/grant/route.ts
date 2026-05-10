import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Notification } from "@/lib/models/notification";
import { ActivityLog } from "@/lib/models/activity-log";
import { activatePurchase } from "@/lib/activate-purchase";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/designers/[id]/grant                                       */
/*                                                                              */
/*  Admin-only manual grants. Use cases:                                       */
/*    • "Give Amaka 200 free SMS for being our beta tester"                   */
/*    • "Bump Tunde to Plus until 30 June, on the house"                       */
/*    • "Grant Studio for 30 days as a goodwill credit"                       */
/*                                                                              */
/*  Body shapes (one of):                                                       */
/*    { type: "sms",           count: number,      reason?: string }          */
/*    { type: "subscription",  planId: "plus|pro", days?: number, reason? }   */
/*    { type: "studio",        days?: number,      reason?: string }          */
/*    { type: "trial_scans",   count: number,      reason?: string }          */
/*                                                                              */
/*  All grants are logged to activity-log + a Notification is sent.            */
/* -------------------------------------------------------------------------- */

interface GrantBody {
  type: "sms" | "subscription" | "studio" | "trial_scans";
  count?: number;
  planId?: "plus" | "pro";
  days?: number;
  reason?: string;
}

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
    const body = (await request.json()) as GrantBody;
    const reason = (body.reason || "Admin grant").slice(0, 280);

    await connectDB();
    const designer = await Designer.findById(id).select("name businessName").lean();
    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer not found" }, { status: 404 });
    }

    /* -------- SMS grant ------------------------------------------------- */
    if (body.type === "sms") {
      const count = Math.floor(Number(body.count));
      if (!isFinite(count) || count <= 0 || count > 5000) {
        return NextResponse.json(
          { success: false, error: "Count must be between 1 and 5000" },
          { status: 400 },
        );
      }
      await Designer.findByIdAndUpdate(id, {
        $inc: { smsBalance: count, smsLifetimePurchased: count },
      });
      await ActivityLog.create({
        designerId: id,
        action: "admin_grant_sms",
        entity: "settings",
        details: `Admin granted ${count} SMS credits — ${reason}`,
        metadata: { count, reason, source: "admin_grant" },
      });
      Notification.create({
        designerId: id,
        type: "system",
        title: `🎁 ${count} free SMS credits added`,
        message: `An admin gifted you SMS credits. ${reason}`,
        link: "/billing",
      }).catch(() => {});
      return NextResponse.json({ success: true, data: { type: "sms", count } });
    }

    /* -------- Trial-scans grant ----------------------------------------- */
    if (body.type === "trial_scans") {
      // We don't store an explicit trial counter — Free plan computes from
      // ScanSession status=completed. Easiest grant: bump them to Plus for
      // a short window so they get the 20/month lane temporarily.
      // If admin specifically asks for "trial scans", we treat it as a 7-day
      // Plus grant. We keep a separate code path so the audit log is honest.
      const days = Math.max(1, Math.min(Math.floor(Number(body.days) || 7), 90));
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      await Designer.findByIdAndUpdate(id, {
        subscription: "plus",
        subscriptionExpiry: expiry,
      });
      await ActivityLog.create({
        designerId: id,
        action: "admin_grant_trial_scans",
        entity: "settings",
        details: `Admin granted ${days}-day Plus access for free scans — ${reason}`,
        metadata: { days, reason, source: "admin_grant" },
      });
      Notification.create({
        designerId: id,
        type: "system",
        title: `🎁 ${days}-day Plus access granted`,
        message: `An admin gave you Plus for ${days} days — enjoy unlimited AI scans this period.`,
        link: "/billing",
      }).catch(() => {});
      return NextResponse.json({
        success: true,
        data: { type: "trial_scans", days, expiresAt: expiry.toISOString() },
      });
    }

    /* -------- Subscription override ------------------------------------ */
    if (body.type === "subscription") {
      const planId = body.planId;
      if (!planId || !SUBSCRIPTION_PLANS.find((p) => p.id === planId)) {
        return NextResponse.json({ success: false, error: "Invalid planId" }, { status: 400 });
      }
      const days = Math.max(1, Math.min(Math.floor(Number(body.days) || 30), 365));
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      await Designer.findByIdAndUpdate(id, {
        subscription: planId,
        subscriptionExpiry: expiry,
      });
      await ActivityLog.create({
        designerId: id,
        action: "admin_grant_subscription",
        entity: "settings",
        details: `Admin granted ${planId} for ${days} days — ${reason}`,
        metadata: { planId, days, reason, source: "admin_grant" },
      });
      Notification.create({
        designerId: id,
        type: "system",
        title: `🎁 ${planId.toUpperCase()} plan granted`,
        message: `An admin extended your plan until ${expiry.toLocaleDateString("en-NG", {
          day: "numeric", month: "short", year: "numeric",
        })}.`,
        link: "/billing",
      }).catch(() => {});
      return NextResponse.json({
        success: true,
        data: { type: "subscription", planId, days, expiresAt: expiry.toISOString() },
      });
    }

    /* -------- Studio addon grant --------------------------------------- */
    if (body.type === "studio") {
      const days = Math.max(1, Math.min(Math.floor(Number(body.days) || 30), 365));
      const result = await activatePurchase({
        designerId: id,
        purpose: "studio_addon",
        source: "manual",
        reference: `ADMIN-GRANT-${Date.now()}`,
        amountNGN: 0,
        payload: { durationDays: days },
      });
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.detail },
          { status: 500 },
        );
      }
      await ActivityLog.create({
        designerId: id,
        action: "admin_grant_studio",
        entity: "settings",
        details: `Admin granted Studio for ${days} days — ${reason}`,
        metadata: { days, reason, source: "admin_grant" },
      });
      return NextResponse.json({ success: true, data: { type: "studio", days } });
    }

    return NextResponse.json({ success: false, error: "Unknown grant type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Grant failed" },
      { status: 500 },
    );
  }
}
