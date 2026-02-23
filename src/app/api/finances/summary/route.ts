import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Order } from "@/lib/models/order";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const designerId = session.user.id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Single aggregation for all financial data
    const [result] = await Order.aggregate([
      { $match: { designerId } },
      {
        $facet: {
          // Overall totals
          totals: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$price" },
                totalCollected: { $sum: "$depositPaid" },
                totalOutstanding: { $sum: { $subtract: ["$price", "$depositPaid"] } },
                orderCount: { $sum: 1 },
              },
            },
          ],

          // This month revenue
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$price" },
                collected: { $sum: "$depositPaid" },
                orders: { $sum: 1 },
              },
            },
          ],

          // Last month revenue (for comparison)
          lastMonth: [
            {
              $match: {
                createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$price" },
                collected: { $sum: "$depositPaid" },
              },
            },
          ],

          // Overdue orders (due date passed, not delivered/cancelled, balance > 0)
          overdue: [
            {
              $match: {
                dueDate: { $lt: now.toISOString() },
                status: { $nin: ["delivered", "cancelled"] },
                $expr: { $gt: ["$price", "$depositPaid"] },
              },
            },
            { $sort: { dueDate: 1 } },
            { $limit: 20 },
            {
              $lookup: {
                from: "clients",
                let: { clientId: { $toObjectId: "$clientId" } },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$clientId"] } } },
                  { $project: { name: 1, phone: 1 } },
                ],
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                title: 1,
                price: 1,
                depositPaid: 1,
                balance: { $subtract: ["$price", "$depositPaid"] },
                dueDate: 1,
                status: 1,
                "client.name": 1,
                "client.phone": 1,
              },
            },
          ],

          // Payment method breakdown
          paymentMethods: [
            { $unwind: "$payments" },
            {
              $group: {
                _id: "$payments.method",
                total: { $sum: "$payments.amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],

          // Monthly trend (last 6 months)
          monthlyTrend: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
                },
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
          ],

          // Top debtors (clients with highest outstanding)
          topDebtors: [
            {
              $match: {
                status: { $nin: ["delivered", "cancelled"] },
                $expr: { $gt: ["$price", "$depositPaid"] },
              },
            },
            {
              $lookup: {
                from: "clients",
                let: { clientId: { $toObjectId: "$clientId" } },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$clientId"] } } },
                  { $project: { name: 1, phone: 1 } },
                ],
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$clientId",
                clientName: { $first: "$client.name" },
                clientPhone: { $first: "$client.phone" },
                totalOwed: { $sum: { $subtract: ["$price", "$depositPaid"] } },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { totalOwed: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    const totals = result.totals[0] || {
      totalRevenue: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      orderCount: 0,
    };

    const thisMonth = result.thisMonth[0] || { revenue: 0, collected: 0, orders: 0 };
    const lastMonth = result.lastMonth[0] || { revenue: 0, collected: 0 };

    const collectionRate =
      totals.totalRevenue > 0
        ? Math.round((totals.totalCollected / totals.totalRevenue) * 100)
        : 0;

    const monthlyGrowth =
      lastMonth.revenue > 0
        ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          ...totals,
          collectionRate,
        },
        thisMonth,
        monthlyGrowth,
        overdue: result.overdue,
        paymentMethods: result.paymentMethods,
        monthlyTrend: result.monthlyTrend.map(
          (m: { _id: { year: number; month: number }; revenue: number; collected: number; orders: number }) => ({
            month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
            revenue: m.revenue,
            collected: m.collected,
            orders: m.orders,
          })
        ),
        topDebtors: result.topDebtors,
      },
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load financial summary" },
      { status: 500 }
    );
  }
}
