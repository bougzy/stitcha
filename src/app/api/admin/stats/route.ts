import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { ScanSession } from "@/lib/models/scan-session";
import { ManualPayment } from "@/lib/models/manual-payment";
import { ActivityLog } from "@/lib/models/activity-log";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/stats                                                       */
/*                                                                              */
/*  System-wide rollup powering the /admin overview.                           */
/* -------------------------------------------------------------------------- */

export async function GET() {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 401 });
  }

  try {
    await connectDB();

    const dayMs = 24 * 60 * 60 * 1000;
    const since30 = new Date(Date.now() - 30 * dayMs);
    const since7 = new Date(Date.now() - 7 * dayMs);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const now = new Date();

    const [
      totalDesigners,
      newDesigners30,
      planDistribution,
      suspendedDesigners,
      totalClients,
      totalOrders,
      ordersThisMonth,
      orderRevenueAgg,
      manualRevenueAgg,
      pendingPayments,
      verifiedPaymentsThisMonth,
      totalScanSessions,
      completedScans30,
      featuredPosts,
      activeBoosts,
      activeStudioCount,
      smsBalanceAgg,
      broadcastsThisMonth,
      totalActivity,
    ] = await Promise.all([
      Designer.countDocuments(),
      Designer.countDocuments({ createdAt: { $gte: since30 } }),
      Designer.aggregate([
        { $group: { _id: "$subscription", count: { $sum: 1 } } },
      ]),
      Designer.countDocuments({ suspended: true }),
      Client.countDocuments(),
      Order.countDocuments({ isDeleted: { $ne: true } }),
      Order.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: startOfMonth },
      }),
      Order.aggregate([
        { $match: { isDeleted: { $ne: true }, paymentStatus: { $in: ["paid", "partial"] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$price" },
            totalCollected: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$payments", []] },
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.amount"] },
                },
              },
            },
          },
        },
      ]),
      ManualPayment.aggregate([
        { $match: { status: "verified" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ManualPayment.countDocuments({ status: "pending" }),
      ManualPayment.countDocuments({
        status: "verified",
        verifiedAt: { $gte: startOfMonth },
      }),
      ScanSession.countDocuments(),
      ScanSession.countDocuments({
        status: "completed",
        createdAt: { $gte: since30 },
      }),
      Order.countDocuments({
        featuredInFeed: true,
        isDeleted: { $ne: true },
      }),
      Order.countDocuments({
        boostedUntil: { $gt: now },
        isDeleted: { $ne: true },
      }),
      Designer.countDocuments({
        "studioAddon.expiresAt": { $gt: now },
      }),
      Designer.aggregate([
        { $group: { _id: null, total: { $sum: "$smsBalance" } } },
      ]),
      BroadcastJob.countDocuments({ createdAt: { $gte: startOfMonth } }),
      ActivityLog.countDocuments(),
    ]);

    const plans: Record<string, number> = { free: 0, plus: 0, pro: 0 };
    planDistribution.forEach((p: { _id: string; count: number }) => {
      if (p._id) plans[p._id] = (plans[p._id] || 0) + p.count;
    });

    const orderRevenue = orderRevenueAgg[0] || { totalRevenue: 0, totalCollected: 0 };
    const manualRevenue = (manualRevenueAgg[0] as Record<string, unknown> | undefined)?.total ?? 0;
    const totalSmsBalance = (smsBalanceAgg[0] as Record<string, unknown> | undefined)?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        designers: {
          total: totalDesigners,
          newLast30: newDesigners30,
          suspended: suspendedDesigners,
          plans,
        },
        clients: {
          total: totalClients,
        },
        orders: {
          total: totalOrders,
          thisMonth: ordersThisMonth,
          totalRevenue: orderRevenue.totalRevenue ?? 0,
          totalCollected: orderRevenue.totalCollected ?? 0,
        },
        scans: {
          total: totalScanSessions,
          completedLast30: completedScans30,
        },
        discover: {
          featuredPosts,
          activeBoosts,
        },
        addons: {
          activeStudio: activeStudioCount,
          totalSmsBalance,
        },
        payments: {
          pending: pendingPayments,
          verifiedThisMonth: verifiedPaymentsThisMonth,
          manualRevenue,
          /** Approximate platform revenue: only manual is reliable here.
           *  Order revenue is designer earnings (clients paying designers),
           *  not Stitcha's revenue. */
          platformRevenue: manualRevenue,
        },
        broadcasts: {
          thisMonth: broadcastsThisMonth,
        },
        totalActivityLogs: totalActivity,
        since: {
          days30: since30.toISOString(),
          days7: since7.toISOString(),
          startOfMonth: startOfMonth.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
