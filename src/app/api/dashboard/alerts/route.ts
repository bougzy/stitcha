import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";

/* -------------------------------------------------------------------------- */
/*  GET /api/dashboard/alerts                                                  */
/*  Returns smart business alerts for the designer                            */
/* -------------------------------------------------------------------------- */

interface Alert {
  id: string;
  type: "overdue_order" | "overdue_payment" | "idle_client" | "stuck_order" | "due_soon";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
}

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
    const now = new Date();

    await connectDB();

    const alerts: Alert[] = [];

    // 1. Orders due in the next 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueSoon = await Order.find({
      designerId,
      dueDate: { $gte: now, $lte: threeDaysFromNow },
      status: { $nin: ["delivered", "cancelled"] },
    })
      .select("title dueDate status")
      .lean();

    for (const order of dueSoon) {
      const o = order as Record<string, unknown>;
      const dueDate = new Date(o.dueDate as Date);
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `due-${o._id}`,
        type: "due_soon",
        severity: daysLeft <= 1 ? "critical" : "warning",
        title: `"${o.title}" due ${daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}`,
        description: `Status: ${o.status}. Due ${dueDate.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`,
        actionUrl: `/orders/${o._id}`,
        actionLabel: "View Order",
      });
    }

    // 2. Overdue orders (past due date, not delivered)
    const overdue = await Order.find({
      designerId,
      dueDate: { $lt: now },
      status: { $nin: ["delivered", "cancelled"] },
    })
      .select("title dueDate")
      .lean();

    for (const order of overdue) {
      const o = order as Record<string, unknown>;
      const daysOverdue = Math.ceil((now.getTime() - new Date(o.dueDate as Date).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `overdue-${o._id}`,
        type: "overdue_order",
        severity: "critical",
        title: `"${o.title}" is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
        description: "This order has passed its due date and is not yet delivered",
        actionUrl: `/orders/${o._id}`,
        actionLabel: "View Order",
      });
    }

    // 3. Orders with unpaid balances (significant balance > 0 and order not cancelled)
    const unpaidOrders = await Order.aggregate([
      {
        $match: {
          designerId: designerObjectId,
          status: { $nin: ["cancelled"] },
          $expr: { $gt: [{ $subtract: ["$price", "$depositPaid"] }, 0] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalBalance: { $sum: { $subtract: ["$price", "$depositPaid"] } },
        },
      },
    ]);

    if (unpaidOrders.length > 0 && unpaidOrders[0].count > 0) {
      alerts.push({
        id: "unpaid-summary",
        type: "overdue_payment",
        severity: unpaidOrders[0].totalBalance > 50000 ? "critical" : "warning",
        title: `${unpaidOrders[0].count} order${unpaidOrders[0].count !== 1 ? "s" : ""} with outstanding payments`,
        description: `Total receivables: \u20A6${unpaidOrders[0].totalBalance.toLocaleString()}`,
        actionUrl: "/orders",
        actionLabel: "View Orders",
      });
    }

    // 4. Clients with no orders in 60+ days (idle clients)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const idleClients = await Client.aggregate([
      { $match: { designerId: designerObjectId } },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "clientId",
          as: "orders",
        },
      },
      {
        $match: {
          $or: [
            { orders: { $size: 0 } },
            {
              "orders.createdAt": { $not: { $gte: sixtyDaysAgo } },
            },
          ],
        },
      },
      {
        $match: {
          createdAt: { $lt: sixtyDaysAgo },
        },
      },
      { $count: "total" },
    ]);

    const idleCount = idleClients.length > 0 ? idleClients[0].total : 0;
    if (idleCount > 0) {
      alerts.push({
        id: "idle-clients",
        type: "idle_client",
        severity: "info",
        title: `${idleCount} client${idleCount !== 1 ? "s" : ""} haven't ordered in 60+ days`,
        description: "Consider reaching out to re-engage these clients",
        actionUrl: "/clients",
        actionLabel: "View Clients",
      });
    }

    // 5. Orders stuck in same status for 7+ days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const stuckOrders = await Order.find({
      designerId,
      status: { $in: ["confirmed", "cutting", "sewing", "fitting", "finishing"] },
      updatedAt: { $lt: sevenDaysAgo },
    })
      .select("title status updatedAt")
      .limit(3)
      .lean();

    for (const order of stuckOrders) {
      const o = order as Record<string, unknown>;
      const daysSince = Math.ceil((now.getTime() - new Date(o.updatedAt as Date).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `stuck-${o._id}`,
        type: "stuck_order",
        severity: "info",
        title: `"${o.title}" hasn't been updated in ${daysSince} days`,
        description: `Still in "${o.status}" status. Consider updating progress.`,
        actionUrl: `/orders/${o._id}`,
        actionLabel: "Update",
      });
    }

    // Sort by severity: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      success: true,
      data: alerts.slice(0, 8), // Max 8 alerts
    });
  } catch (error) {
    console.error("GET /api/dashboard/alerts error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
