import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { ActivityLog } from "@/lib/models/activity-log";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    await connectDB();

    const Order = mongoose.models.Order;

    const [
      totalDesigners,
      planDistribution,
      recentSignups,
      totalOrders,
      revenueData,
      recentActivity,
    ] = await Promise.all([
      Designer.countDocuments(),
      Designer.aggregate([
        { $group: { _id: "$subscription", count: { $sum: 1 } } },
      ]),
      Designer.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      Order ? Order.countDocuments() : 0,
      Order
        ? Order.aggregate([
            { $match: { paymentStatus: { $in: ["paid", "partial"] } } },
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
          ])
        : [],
      ActivityLog.countDocuments(),
    ]);

    const plans: Record<string, number> = { free: 0, pro: 0, business: 0 };
    planDistribution.forEach((p: { _id: string; count: number }) => {
      plans[p._id] = p.count;
    });

    const revenue = revenueData[0] || { totalRevenue: 0, totalCollected: 0 };

    return NextResponse.json({
      success: true,
      data: {
        totalDesigners,
        planDistribution: plans,
        recentSignups,
        totalOrders,
        totalRevenue: revenue.totalRevenue,
        totalCollected: revenue.totalCollected,
        totalActivityLogs: recentActivity,
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
