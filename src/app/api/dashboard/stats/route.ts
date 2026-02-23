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

    const [
      totalClients,
      totalOrders,
      activeOrders,
      revenueResult,
      recentClients,
      recentOrders,
      scansThisMonth,
      ordersByStatusResult,
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
