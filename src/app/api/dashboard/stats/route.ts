import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Order } from "@/lib/models/order";
import { ScanSession } from "@/lib/models/scan-session";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const designerObjectId = new mongoose.Types.ObjectId(designerId);

    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Single $facet aggregation replaces 9 separate Order queries
    const [orderFacetResult, totalClients, recentClients, scansThisMonth] =
      await Promise.all([
        Order.aggregate([
          { $match: { designerId: designerObjectId } },
          {
            $facet: {
              totalOrders: [{ $count: "count" }],
              activeOrders: [
                { $match: { status: { $nin: ["delivered", "cancelled"] } } },
                { $count: "count" },
              ],
              revenue: [
                {
                  $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $ne: "cancelled" },
                  },
                },
                { $group: { _id: null, total: { $sum: "$price" } } },
              ],
              recentOrders: [
                { $sort: { createdAt: -1 as const } },
                { $limit: 5 },
                {
                  $lookup: {
                    from: "clients",
                    localField: "clientId",
                    foreignField: "_id",
                    as: "_client",
                  },
                },
                {
                  $unwind: {
                    path: "$_client",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $addFields: {
                    client: {
                      name: "$_client.name",
                      phone: "$_client.phone",
                    },
                  },
                },
                { $project: { _client: 0 } },
              ],
              byStatus: [
                { $group: { _id: "$status", count: { $sum: 1 } } },
              ],
              monthlyTrend: [
                {
                  $match: {
                    createdAt: { $gte: sixMonthsAgo },
                    status: { $ne: "cancelled" },
                  },
                },
                {
                  $group: {
                    _id: {
                      year: { $year: "$createdAt" },
                      month: { $month: "$createdAt" },
                    },
                    revenue: { $sum: "$price" },
                    collected: { $sum: "$depositPaid" },
                    orders: { $sum: 1 },
                  },
                },
                { $sort: { "_id.year": 1 as const, "_id.month": 1 as const } },
              ],
              garments: [
                { $match: { status: { $ne: "cancelled" } } },
                {
                  $group: {
                    _id: "$garmentType",
                    count: { $sum: 1 },
                    revenue: { $sum: "$price" },
                  },
                },
                { $sort: { count: -1 as const } },
                { $limit: 8 },
              ],
              paymentStats: [
                { $match: { status: { $nin: ["cancelled"] } } },
                {
                  $group: {
                    _id: "$paymentStatus",
                    count: { $sum: 1 },
                    total: { $sum: "$price" },
                  },
                },
              ],
              receivables: [
                {
                  $match: {
                    status: { $nin: ["cancelled", "delivered"] },
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalPrice: { $sum: "$price" },
                    totalPaid: { $sum: "$depositPaid" },
                  },
                },
              ],
            },
          },
        ]),
        Client.countDocuments({ designerId }),
        Client.find({ designerId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        ScanSession.countDocuments({
          designerId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ]);

    // Extract facet results
    const facet = orderFacetResult[0];
    const totalOrders = facet.totalOrders[0]?.count ?? 0;
    const activeOrders = facet.activeOrders[0]?.count ?? 0;
    const revenue = facet.revenue[0]?.total ?? 0;

    const ordersByStatus: Record<string, number> = {};
    for (const item of facet.byStatus) {
      ordersByStatus[item._id] = item.count;
    }

    const formattedOrders = facet.recentOrders.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order: any) => ({
        ...order,
        clientId: order.clientId?.toString() ?? order.clientId,
      })
    );

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const revenueTrend = facet.monthlyTrend.map(
      (m: { _id: { year: number; month: number }; revenue: number; collected: number; orders: number }) => ({
        month: monthNames[m._id.month - 1],
        revenue: m.revenue,
        collected: m.collected,
        orders: m.orders,
      })
    );

    const garments = facet.garments.map(
      (g: { _id: string; count: number; revenue: number }) => ({
        type: g._id,
        count: g.count,
        revenue: g.revenue,
      })
    );

    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    for (const p of facet.paymentStats as { _id: string | null; count: number; total: number }[]) {
      paymentBreakdown[p._id || "unpaid"] = { count: p.count, total: p.total };
    }

    const receivables =
      facet.receivables.length > 0
        ? facet.receivables[0].totalPrice - facet.receivables[0].totalPaid
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        totalOrders,
        activeOrders,
        revenue,
        scansThisMonth,
        recentClients: JSON.parse(JSON.stringify(recentClients)),
        recentOrders: JSON.parse(JSON.stringify(formattedOrders)),
        ordersByStatus,
        revenueTrend,
        garments,
        paymentBreakdown,
        receivables,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
