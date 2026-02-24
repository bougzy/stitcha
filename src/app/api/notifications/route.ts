import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Notification } from "@/lib/models/notification";
import { Order } from "@/lib/models/order";
import { CalendarEvent } from "@/lib/models/calendar-event";

/* -------------------------------------------------------------------------- */
/*  GET /api/notifications                                                     */
/*  Returns unread + recent notifications, auto-generates contextual ones     */
/* -------------------------------------------------------------------------- */

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

    // Auto-generate notifications for current conditions
    await generateNotifications(designerId, designerObjectId, now);

    // Fetch recent notifications (unread first, then by date)
    const notifications = await Notification.find({ designerId: designerObjectId })
      .sort({ read: 1, createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = await Notification.countDocuments({
      designerId: designerObjectId,
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: JSON.parse(JSON.stringify(notifications)),
        unreadCount,
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/notifications                                                     */
/*  Mark notifications as read                                                */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
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
    const body = await request.json();

    await connectDB();

    if (body.markAllRead) {
      await Notification.updateMany(
        { designerId: designerObjectId, read: false },
        { $set: { read: true } }
      );
    } else if (body.id) {
      await Notification.updateOne(
        { _id: body.id, designerId: designerObjectId },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Auto-generate notifications                                                */
/* -------------------------------------------------------------------------- */

async function generateNotifications(
  designerId: string,
  designerObjectId: mongoose.Types.ObjectId,
  now: Date
) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const todayKey = today.toISOString().split("T")[0];

  // Check if we already generated today (avoid duplicates)
  const existingToday = await Notification.findOne({
    designerId: designerObjectId,
    createdAt: { $gte: today },
    type: { $in: ["overdue_payment", "deadline_approaching", "event_prep"] },
  });
  if (existingToday) return;

  const notifications: {
    designerId: mongoose.Types.ObjectId;
    type: string;
    title: string;
    message: string;
    link?: string;
  }[] = [];

  // 1. Overdue payments (orders delivered but not fully paid)
  const overdueOrders = await Order.find({
    designerId,
    status: "delivered",
    paymentStatus: { $in: ["unpaid", "partial"] },
    isDeleted: { $ne: true },
  })
    .select("title price depositPaid clientId")
    .limit(5)
    .lean();

  for (const order of overdueOrders) {
    const owed = (order.price || 0) - (order.depositPaid || 0);
    if (owed > 0) {
      notifications.push({
        designerId: designerObjectId,
        type: "overdue_payment",
        title: "Payment Outstanding",
        message: `"${order.title}" has ₦${owed.toLocaleString()} outstanding. Follow up to collect.`,
        link: `/orders/${order._id}`,
      });
    }
  }

  // 2. Approaching deadlines (orders due within 3 days)
  const urgentOrders = await Order.find({
    designerId,
    status: { $nin: ["delivered", "cancelled"] },
    dueDate: { $gte: today, $lte: threeDaysFromNow },
    isDeleted: { $ne: true },
  })
    .select("title dueDate status")
    .lean();

  for (const order of urgentOrders) {
    const dueDate = new Date(order.dueDate);
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      designerId: designerObjectId,
      type: "deadline_approaching",
      title: daysLeft <= 0 ? "Deadline Today!" : `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      message: `"${order.title}" is ${daysLeft <= 0 ? "due today" : `due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}. Current status: ${order.status}.`,
      link: `/orders/${order._id}`,
    });
  }

  // 3. Upcoming events within 5 days
  const fiveDaysFromNow = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
  const upcomingEvents = await CalendarEvent.find({
    designerId: designerObjectId,
    date: { $gte: today, $lte: fiveDaysFromNow },
    type: { $in: ["owambe", "custom"] },
  })
    .select("title date type")
    .limit(3)
    .lean();

  for (const event of upcomingEvents) {
    const eventDate = new Date(event.date);
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      designerId: designerObjectId,
      type: "event_prep",
      title: "Upcoming Event",
      message: `"${event.title}" is ${daysUntil <= 0 ? "today" : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}. Prepare accordingly!`,
      link: "/calendar",
    });
  }

  // Bulk insert (limit to 10 per day)
  if (notifications.length > 0) {
    await Notification.insertMany(notifications.slice(0, 10));
  }
}
