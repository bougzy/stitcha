import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Client } from "@/lib/models/client";
import { Order } from "@/lib/models/order";
import { ScanSession } from "@/lib/models/scan-session";
import { ManualPayment } from "@/lib/models/manual-payment";
import { ActivityLog } from "@/lib/models/activity-log";
import { BroadcastJob } from "@/lib/models/broadcast-job";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/designers/[id]                                              */
/*                                                                              */
/*  Full profile + lifetime counters + recent activity for a single designer. */
/*  Powers the /admin/designers/[id] page.                                     */
/* -------------------------------------------------------------------------- */

export async function GET(
  _req: Request,
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

    await connectDB();

    const designer = await Designer.findById(id)
      .select("-password -verificationToken -resetPasswordToken -resetPasswordExpires -ownerPin")
      .lean();
    if (!designer) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const [
      clientCount,
      orderCount,
      orderRevenueAgg,
      featuredCount,
      activeBoosts,
      scanCount,
      completedScans,
      manualPayments,
      pendingPayments,
      manualRevenueAgg,
      recentActivity,
      broadcastCount,
    ] = await Promise.all([
      Client.countDocuments({ designerId: id }),
      Order.countDocuments({ designerId: id, isDeleted: { $ne: true } }),
      Order.aggregate([
        { $match: { designerId: new Types.ObjectId(id), isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
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
      Order.countDocuments({
        designerId: id,
        featuredInFeed: true,
        isDeleted: { $ne: true },
      }),
      Order.countDocuments({
        designerId: id,
        boostedUntil: { $gt: new Date() },
        isDeleted: { $ne: true },
      }),
      ScanSession.countDocuments({ designerId: id }),
      ScanSession.countDocuments({ designerId: id, status: "completed" }),
      ManualPayment.find({ designerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ManualPayment.countDocuments({ designerId: id, status: "pending" }),
      ManualPayment.aggregate([
        { $match: { designerId: new Types.ObjectId(id), status: "verified" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      ActivityLog.find({ designerId: id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      BroadcastJob.countDocuments({ designerId: id }),
    ]);

    const orderRevenue = (orderRevenueAgg[0] as Record<string, unknown> | undefined) || {};
    const manualRevenue = (manualRevenueAgg[0] as Record<string, unknown> | undefined)?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        designer: JSON.parse(JSON.stringify(designer)),
        stats: {
          clients: clientCount,
          orders: orderCount,
          totalCollectedNGN: orderRevenue.totalCollected ?? 0,
          featuredPosts: featuredCount,
          activeBoosts,
          scans: scanCount,
          completedScans,
          broadcasts: broadcastCount,
          pendingPayments,
          paidToStitchaNGN: manualRevenue,
        },
        recentPayments: JSON.parse(JSON.stringify(manualPayments)),
        recentActivity: JSON.parse(JSON.stringify(recentActivity)),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
