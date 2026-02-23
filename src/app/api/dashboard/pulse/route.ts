import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";

/* -------------------------------------------------------------------------- */
/*  GET /api/dashboard/pulse                                                   */
/*  Returns personalized daily briefing data for the designer                 */
/* -------------------------------------------------------------------------- */

const NIGERIAN_PROVERBS = [
  "A tree does not stand on one root — diversify your skills.",
  "When the drumbeat changes, the dance must change too — adapt to trends.",
  "No one tests the depth of a river with both feet — take calculated risks.",
  "The lizard that fell from the iroko tree said it would praise itself if no one else did — celebrate your wins.",
  "A single hand cannot tie a bundle — build strong client relationships.",
  "He who is patient can cook a stone — persistence pays off.",
  "The goat that has many friends eats well — your network is your net worth.",
  "When the mouse laughs at the cat, there is a hole nearby — always have a backup plan.",
  "However long the night, the dawn will break — slow seasons pass.",
  "Not all that is dipped in gold is gold — quality over quantity.",
  "An elder who sits where he can be seen does not eat food that is forbidden — protect your reputation.",
  "The man who chases two rabbits catches neither — focus on one task at a time.",
  "Rain does not fall on one roof alone — everyone faces challenges.",
  "The eye that has seen is different from the ear that has heard — experience is the best teacher.",
  "When you follow in the path of your father, you learn to walk like him — honor your craft.",
  "A child who asks questions does not lose their way — never stop learning.",
  "If you want to go fast, go alone. If you want to go far, go together — build a team.",
  "One who plants grapes by the roadside, and one who marries a beautiful woman, share the same problem — guard your designs.",
  "A bird does not sing because it has an answer — it sings because it has a song — create with passion.",
  "The best time to plant a tree was 20 years ago. The second best time is now — start today.",
];

const BUSINESS_TIPS = [
  "Tip: Take photos of every completed garment for your portfolio. It builds trust with new clients.",
  "Tip: Send a thank-you message to clients 3 days after delivery. It increases repeat orders by 40%.",
  "Tip: Update order statuses daily. Clients feel more confident when they see progress.",
  "Tip: Offer a small discount for referrals. Word-of-mouth is the cheapest marketing.",
  "Tip: Always ask for measurements on both sides of the body. Asymmetry is more common than you think.",
  "Tip: Create a WhatsApp broadcast list for seasonal promotions. It's free marketing.",
  "Tip: Keep a fabric swatch library. Clients love choosing from physical samples.",
  "Tip: Set due dates 2 days before the actual deadline. It gives you a buffer.",
  "Tip: Record every payment immediately. It prevents disputes and builds trust.",
  "Tip: Use your gallery photos as before/after showcases on social media.",
  "Tip: Check in with clients who haven't ordered in 60+ days. A simple 'hello' can bring them back.",
  "Tip: Price transparency builds trust. Always break down costs for clients who ask.",
  "Tip: Track which garment types sell most. Double down on what works.",
  "Tip: Collect deposits upfront. It shows commitment from both sides.",
  "Tip: Build relationships, not just transactions. Remember client birthdays and special dates.",
];

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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await connectDB();

    // Run all queries in parallel
    const [
      dueSoonOrders,
      overdueOrders,
      revenueThisMonth,
      unpaidSummary,
      deliveredThisMonth,
      totalActiveOrders,
      recentCompletions,
    ] = await Promise.all([
      // Orders due within 3 days
      Order.find({
        designerId,
        dueDate: { $gte: now, $lte: threeDaysFromNow },
        status: { $nin: ["delivered", "cancelled"] },
      })
        .select("title dueDate status")
        .lean(),

      // Overdue orders
      Order.countDocuments({
        designerId,
        dueDate: { $lt: now },
        status: { $nin: ["delivered", "cancelled"] },
      }),

      // Revenue this month
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
            createdAt: { $gte: thisMonthStart },
            status: { $nin: ["cancelled"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$price" },
            totalCollected: { $sum: "$depositPaid" },
          },
        },
      ]),

      // Outstanding payments
      Order.aggregate([
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
            totalOwed: { $sum: { $subtract: ["$price", "$depositPaid"] } },
            count: { $sum: 1 },
          },
        },
      ]),

      // Delivered this month (wins)
      Order.countDocuments({
        designerId,
        status: "delivered",
        updatedAt: { $gte: thisMonthStart },
      }),

      // Total active orders
      Order.countDocuments({
        designerId,
        status: { $nin: ["delivered", "cancelled"] },
      }),

      // Recent completions (last 7 days) for win celebration
      Order.find({
        designerId,
        status: "delivered",
        updatedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      })
        .select("title price")
        .limit(3)
        .lean(),
    ]);

    // Build the pulse
    const revenue = revenueThisMonth[0] || { totalRevenue: 0, totalCollected: 0 };
    const unpaid = unpaidSummary[0] || { totalOwed: 0, count: 0 };

    // Pick daily content based on date (changes each day)
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const proverb = NIGERIAN_PROVERBS[dayOfYear % NIGERIAN_PROVERBS.length];
    const tip = BUSINESS_TIPS[dayOfYear % BUSINESS_TIPS.length];

    // Build deadlines list
    const deadlines = (dueSoonOrders as Record<string, unknown>[]).map((o) => {
      const dueDate = new Date(o.dueDate as Date);
      const daysLeft = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: String(o._id),
        title: o.title as string,
        status: o.status as string,
        daysLeft,
        dueDate: dueDate.toISOString(),
      };
    });

    // Build wins
    const wins: string[] = [];
    if (deliveredThisMonth > 0) {
      wins.push(`${deliveredThisMonth} order${deliveredThisMonth !== 1 ? "s" : ""} delivered this month`);
    }
    const completions = recentCompletions as Record<string, unknown>[];
    if (completions.length > 0) {
      const totalEarned = completions.reduce((sum, o) => sum + (o.price as number), 0);
      wins.push(
        `Earned \u20A6${totalEarned.toLocaleString()} from ${completions.length} recent delivery${completions.length !== 1 ? "ies" : "y"}`
      );
    }

    // Determine mood/summary
    let mood: "great" | "good" | "caution" | "alert" = "good";
    if (overdueOrders > 0) mood = "alert";
    else if (deadlines.some((d) => d.daysLeft <= 1)) mood = "caution";
    else if (totalActiveOrders === 0 && wins.length > 0) mood = "great";

    // Build nudge message
    let nudge = "";
    if (totalActiveOrders === 0) {
      nudge = "No active orders right now. Perfect time to follow up with idle clients or update your portfolio!";
    } else if (overdueOrders > 0) {
      nudge = `You have ${overdueOrders} overdue order${overdueOrders !== 1 ? "s" : ""}. Let's get them back on track.`;
    } else if (deadlines.length > 0) {
      nudge = `${deadlines.length} order${deadlines.length !== 1 ? "s" : ""} due soon. Stay focused!`;
    } else {
      nudge = "All on track! Keep up the great work.";
    }

    return NextResponse.json({
      success: true,
      data: {
        mood,
        nudge,
        money: {
          revenueThisMonth: revenue.totalRevenue,
          collectedThisMonth: revenue.totalCollected,
          outstanding: unpaid.totalOwed,
          unpaidOrders: unpaid.count,
        },
        deadlines,
        overdueCount: overdueOrders,
        activeOrders: totalActiveOrders,
        wins,
        proverb,
        tip,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/pulse error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
