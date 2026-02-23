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

    // Last 6 months for revenue trend
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalClients,
      totalOrders,
      activeOrders,
      revenueResult,
      recentClients,
      recentOrders,
      scansThisMonth,
      ordersByStatusResult,
      monthlyRevenueTrend,
      garmentBreakdown,
      paymentStats,
      totalReceivables,
    ] = await Promise.all([
      Client.countDocuments({ designerId }),
      Order.countDocuments({ designerId }),
      Order.countDocuments({
        designerId,
        status: { $nin: ["delivered", "cancelled"] },
      }),
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$price" },
          },
        },
      ]),
      Client.find({ designerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({ designerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("clientId", "name phone")
        .lean(),
      ScanSession.countDocuments({
        designerId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Order.aggregate([
        { $match: { designerId: designerObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Monthly revenue trend (last 6 months)
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
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
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      // Garment type breakdown
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: "$garmentType",
            count: { $sum: 1 },
            revenue: { $sum: "$price" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      // Payment status breakdown
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
            status: { $nin: ["cancelled"] },
          },
        },
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            total: { $sum: "$price" },
          },
        },
      ]),
      // Total outstanding receivables
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
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
      ]),
    ]);

    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const ordersByStatus: Record<string, number> = {};
    for (const item of ordersByStatusResult) {
      ordersByStatus[item._id] = item.count;
    }

    const formattedOrders = recentOrders.map((order) => {
      const populated = order as Record<string, unknown>;
      const client = populated.clientId as { name?: string; phone?: string } | null;
      return {
        ...order,
        client: client ? { name: client.name, phone: client.phone } : null,
        clientId:
          populated.clientId && typeof populated.clientId === "object" && "_id" in populated.clientId
            ? (populated.clientId as { _id: string })._id.toString()
            : populated.clientId,
      };
    });

    // Build monthly revenue trend with proper month names
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueTrend = monthlyRevenueTrend.map(
      (m: { _id: { year: number; month: number }; revenue: number; collected: number; orders: number }) => ({
        month: monthNames[m._id.month - 1],
        revenue: m.revenue,
        collected: m.collected,
        orders: m.orders,
      })
    );

    // Garment breakdown
    const garments = garmentBreakdown.map(
      (g: { _id: string; count: number; revenue: number }) => ({
        type: g._id,
        count: g.count,
        revenue: g.revenue,
      })
    );

    // Payment status
    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    for (const p of paymentStats as { _id: string | null; count: number; total: number }[]) {
      paymentBreakdown[p._id || "unpaid"] = { count: p.count, total: p.total };
    }

    const receivables = totalReceivables.length > 0
      ? totalReceivables[0].totalPrice - totalReceivables[0].totalPaid
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
