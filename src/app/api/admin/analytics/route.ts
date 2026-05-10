import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { ManualPayment } from "@/lib/models/manual-payment";
import { Designer } from "@/lib/models/designer";
import { ScanSession } from "@/lib/models/scan-session";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/analytics?range=30d|90d|365d                                */
/*                                                                              */
/*  Returns:                                                                    */
/*    • Revenue time-series (daily) for the requested range                    */
/*    • Revenue breakdown by purpose                                           */
/*    • Revenue breakdown by source (manual vs Paystack — using activity log) */
/*    • Designer signups time-series                                           */
/*    • Top revenue contributors (designers ordered by amount paid)            */
/*    • Verification SLA (avg + p50/p95 time from submission to verify)        */
/*    • Active subscription count by plan                                      */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

function rangeToDays(r: string | null): number {
  if (r === "90d") return 90;
  if (r === "365d") return 365;
  return 30;
}

interface DayBucket {
  date: string;
  manualNGN: number;
  manualCount: number;
  signups: number;
  scans: number;
  broadcasts: number;
}

function emptyBuckets(days: number): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    map.set(key, {
      date: key,
      manualNGN: 0,
      manualCount: 0,
      signups: 0,
      scans: 0,
      broadcasts: 0,
    });
  }
  return map;
}

function bucketKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const days = rangeToDays(searchParams.get("range"));
    const since = new Date(Date.now() - days * DAY_MS);

    /* -- Parallel aggregations ---------------------------------------- */
    const [
      revenueByDay,
      revenueByPurpose,
      signupsByDay,
      scansByDay,
      broadcastsByDay,
      verifiedPayments,
      topContributorsAgg,
      planCounts,
      pendingPayments,
      totalAllTime,
      averageVerificationMs,
    ] = await Promise.all([
      ManualPayment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$verifiedAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      ManualPayment.aggregate([
        { $match: { status: "verified", verifiedAt: { $gte: since } } },
        {
          $group: {
            _id: "$purpose",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Designer.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      ScanSession.aggregate([
        { $match: { status: "completed", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      BroadcastJob.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      ManualPayment.find({ status: "verified" })
        .select("amount purpose verifiedAt createdAt designerId")
        .lean(),
      ManualPayment.aggregate([
        { $match: { status: "verified" } },
        {
          $group: {
            _id: "$designerId",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Designer.aggregate([
        {
          $match: {
            $or: [
              { subscriptionExpiry: { $gt: new Date() } },
              { subscription: "free" },
            ],
          },
        },
        { $group: { _id: "$subscription", count: { $sum: 1 } } },
      ]),
      ManualPayment.countDocuments({ status: "pending" }),
      ManualPayment.aggregate([
        { $match: { status: "verified" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      // Average verification SLA — verifiedAt - createdAt for verified payments
      ManualPayment.aggregate([
        { $match: { status: "verified", verifiedAt: { $exists: true } } },
        {
          $project: {
            ms: { $subtract: ["$verifiedAt", "$createdAt"] },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: "$ms" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    /* -- Build day-bucket time series --------------------------------- */
    const buckets = emptyBuckets(days);
    for (const r of revenueByDay) {
      const b = buckets.get(r._id);
      if (b) { b.manualNGN = r.total; b.manualCount = r.count; }
    }
    for (const r of signupsByDay) {
      const b = buckets.get(r._id);
      if (b) b.signups = r.count;
    }
    for (const r of scansByDay) {
      const b = buckets.get(r._id);
      if (b) b.scans = r.count;
    }
    for (const r of broadcastsByDay) {
      const b = buckets.get(r._id);
      if (b) b.broadcasts = r.count;
    }
    const series = Array.from(buckets.values());

    /* -- Resolve top contributors (designer hydration) ---------------- */
    const topIds = topContributorsAgg.map((t: { _id: Types.ObjectId }) => t._id);
    const topDesigners = await Designer.find({ _id: { $in: topIds } })
      .select("name businessName email phone")
      .lean();
    const topMap = new Map(
      topDesigners.map((d) => [
        String((d as unknown as Record<string, unknown>)._id),
        d as unknown as Record<string, unknown>,
      ]),
    );
    const topContributors = topContributorsAgg.map(
      (row: { _id: Types.ObjectId; total: number; count: number }) => {
        const d = topMap.get(String(row._id));
        return {
          designerId: String(row._id),
          name: d?.name ?? "—",
          businessName: d?.businessName ?? null,
          email: d?.email ?? null,
          totalNGN: row.total,
          count: row.count,
        };
      },
    );

    /* -- Median + p95 verification SLA from raw rows ------------------ */
    const slaSamples: number[] = verifiedPayments
      .map((p) => {
        const pp = p as unknown as Record<string, unknown>;
        const ver = pp.verifiedAt ? new Date(pp.verifiedAt as string).getTime() : 0;
        const cre = pp.createdAt ? new Date(pp.createdAt as string).getTime() : 0;
        return ver > cre ? ver - cre : 0;
      })
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    function pct(arr: number[], p: number): number {
      if (arr.length === 0) return 0;
      const idx = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length));
      return arr[idx];
    }

    const sla = {
      averageMs: (averageVerificationMs[0] as Record<string, unknown> | undefined)?.avgMs ?? 0,
      medianMs: pct(slaSamples, 50),
      p95Ms: pct(slaSamples, 95),
      sampleCount: slaSamples.length,
    };

    /* -- Plan counts --------------------------------------------------- */
    const plans: Record<string, number> = { free: 0, plus: 0, pro: 0 };
    for (const p of planCounts) {
      const k = (p as { _id: string })._id;
      if (k && k in plans) plans[k] = (p as { count: number }).count;
    }

    /* -- Totals -------------------------------------------------------- */
    const totalAgg = (totalAllTime[0] as Record<string, unknown> | undefined) ?? {};
    const lifetimeRevenue = (totalAgg.total as number) ?? 0;
    const lifetimeCount = (totalAgg.count as number) ?? 0;
    const rangeRevenue = revenueByDay.reduce(
      (s: number, r: { total: number }) => s + (r.total || 0),
      0,
    );
    const rangeCount = revenueByDay.reduce(
      (s: number, r: { count: number }) => s + (r.count || 0),
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        rangeDays: days,
        totals: {
          lifetimeRevenue,
          lifetimeCount,
          rangeRevenue,
          rangeCount,
          pendingPayments,
        },
        series,
        revenueByPurpose: revenueByPurpose.map((r: { _id: string; total: number; count: number }) => ({
          purpose: r._id,
          total: r.total,
          count: r.count,
        })),
        topContributors,
        plans,
        sla,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

