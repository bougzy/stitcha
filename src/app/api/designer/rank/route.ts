import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/designer/rank                                                     */
/*  Returns designer's professional tier, XP, and rank data                   */
/* -------------------------------------------------------------------------- */

interface RankTier {
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
  title: string;
}

const RANK_TIERS: RankTier[] = [
  { name: "apprentice", minXP: 0, maxXP: 499, icon: "🧵", color: "#94a3b8", title: "Apprentice" },
  { name: "journeyman", minXP: 500, maxXP: 1499, icon: "✂️", color: "#C75B39", title: "Journeyman" },
  { name: "craftsman", minXP: 1500, maxXP: 3499, icon: "🪡", color: "#D4A853", title: "Craftsman" },
  { name: "master", minXP: 3500, maxXP: 6999, icon: "👑", color: "#8B5CF6", title: "Master" },
  { name: "grandmaster", minXP: 7000, maxXP: 99999, icon: "💎", color: "#059669", title: "Grandmaster" },
];

// XP rewards for different actions
const XP_VALUES = {
  orderCreated: 10,
  orderDelivered: 50,
  paymentCollectedFull: 30,
  paymentCollectedPartial: 15,
  clientAdded: 20,
  measurementTaken: 15,
  onTimeDelivery: 25,
  fiveStarMonth: 100, // delivered 5+ orders in a month
  portfolioPhoto: 5,
};

function getTier(xp: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (xp >= RANK_TIERS[i].minXP) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

function getNextTier(xp: number): RankTier | null {
  const currentTier = getTier(xp);
  const idx = RANK_TIERS.findIndex((t) => t.name === currentTier.name);
  return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
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
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    await connectDB();

    // Gather all data in parallel
    const [
      designer,
      totalOrders,
      deliveredOrders,
      totalClients,
      clientsWithMeasurements,
      fullPaidOrders,
      partialPaidOrders,
      onTimeDeliveries,
      ordersWithGallery,
      deliveredThisMonth,
      deliveredLastMonth,
      monthlyDeliveryData,
    ] = await Promise.all([
      Designer.findById(designerId).select("name businessName createdAt specialties"),
      Order.countDocuments({ designerId }),
      Order.countDocuments({ designerId, status: "delivered" }),
      Client.countDocuments({ designerId: designerObjectId }),
      Client.countDocuments({
        designerId: designerObjectId,
        measurements: { $exists: true, $ne: null },
      }),
      Order.countDocuments({ designerId, paymentStatus: "paid" }),
      Order.countDocuments({ designerId, paymentStatus: "partial" }),
      // On-time deliveries (delivered before or on dueDate)
      Order.countDocuments({
        designerId,
        status: "delivered",
        dueDate: { $exists: true },
        $expr: { $lte: ["$updatedAt", "$dueDate"] },
      }),
      // Orders with gallery photos
      Order.countDocuments({
        designerId,
        "gallery.0": { $exists: true },
      }),
      Order.countDocuments({
        designerId,
        status: "delivered",
        updatedAt: { $gte: thisMonthStart },
      }),
      Order.countDocuments({
        designerId,
        status: "delivered",
        updatedAt: { $gte: lastMonthStart, $lt: thisMonthStart },
      }),
      // Monthly delivery counts for "five star month" bonuses
      Order.aggregate([
        {
          $match: {
            designerId: designerObjectId,
            status: "delivered",
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$updatedAt" },
              month: { $month: "$updatedAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $match: { count: { $gte: 5 } },
        },
        {
          $count: "fiveStarMonths",
        },
      ]),
    ]);

    // Calculate XP
    const fiveStarMonths = monthlyDeliveryData[0]?.fiveStarMonths || 0;

    let totalXP = 0;
    totalXP += totalOrders * XP_VALUES.orderCreated;
    totalXP += deliveredOrders * XP_VALUES.orderDelivered;
    totalXP += fullPaidOrders * XP_VALUES.paymentCollectedFull;
    totalXP += partialPaidOrders * XP_VALUES.paymentCollectedPartial;
    totalXP += totalClients * XP_VALUES.clientAdded;
    totalXP += clientsWithMeasurements * XP_VALUES.measurementTaken;
    totalXP += onTimeDeliveries * XP_VALUES.onTimeDelivery;
    totalXP += fiveStarMonths * XP_VALUES.fiveStarMonth;
    totalXP += ordersWithGallery * XP_VALUES.portfolioPhoto;

    const currentTier = getTier(totalXP);
    const nextTier = getNextTier(totalXP);
    const xpInCurrentTier = totalXP - currentTier.minXP;
    const xpForNextTier = nextTier ? nextTier.minXP - currentTier.minXP : 1;
    const progressPercent = nextTier
      ? Math.min(100, Math.round((xpInCurrentTier / xpForNextTier) * 100))
      : 100;

    // Build achievements
    const achievements = [];
    if (deliveredOrders >= 1) achievements.push({ label: "First Delivery", icon: "🎯", earned: true });
    if (deliveredOrders >= 10) achievements.push({ label: "10 Deliveries", icon: "🏆", earned: true });
    if (deliveredOrders >= 50) achievements.push({ label: "50 Deliveries", icon: "⭐", earned: true });
    if (totalClients >= 5) achievements.push({ label: "5 Clients", icon: "🤝", earned: true });
    if (totalClients >= 25) achievements.push({ label: "25 Clients", icon: "👥", earned: true });
    if (fullPaidOrders >= 5) achievements.push({ label: "Paid in Full x5", icon: "💰", earned: true });
    if (onTimeDeliveries >= 5) achievements.push({ label: "On-Time x5", icon: "⏰", earned: true });
    if (fiveStarMonths >= 1) achievements.push({ label: "Power Month", icon: "🔥", earned: true });
    if (ordersWithGallery >= 3) achievements.push({ label: "Portfolio Pro", icon: "📸", earned: true });

    // Add locked achievements
    if (deliveredOrders < 1) achievements.push({ label: "First Delivery", icon: "🎯", earned: false });
    if (deliveredOrders < 50 && deliveredOrders >= 1) achievements.push({ label: "50 Deliveries", icon: "⭐", earned: false });
    if (totalClients < 25 && totalClients >= 5) achievements.push({ label: "25 Clients", icon: "👥", earned: false });
    if (fiveStarMonths < 1) achievements.push({ label: "Power Month", icon: "🔥", earned: false });

    // Monthly report card data
    const designerData = designer as Record<string, unknown> | null;
    const memberSince = designerData?.createdAt
      ? new Date(designerData.createdAt as Date)
      : new Date();
    const monthsActive = Math.max(
      1,
      Math.floor((now.getTime() - memberSince.getTime()) / (30 * 24 * 60 * 60 * 1000))
    );

    // Monthly challenges — rotating set based on current month
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = monthNames[now.getMonth()];

    // Get this month's data for challenge progress
    const [ordersThisMonth, clientsThisMonth, paymentsThisMonth, onTimeThisMonth] = await Promise.all([
      Order.countDocuments({ designerId, createdAt: { $gte: thisMonthStart } }),
      Client.countDocuments({ designerId: designerObjectId, createdAt: { $gte: thisMonthStart } }),
      Order.countDocuments({ designerId, paymentStatus: "paid", updatedAt: { $gte: thisMonthStart } }),
      Order.countDocuments({
        designerId,
        status: "delivered",
        dueDate: { $exists: true },
        updatedAt: { $gte: thisMonthStart },
        $expr: { $lte: ["$updatedAt", "$dueDate"] },
      }),
    ]);

    // 4 rotating challenges (change by month index)
    const monthIdx = now.getMonth();
    const challengePool = [
      { id: "deliver5", title: "Deliver 5 orders", description: "Complete 5 deliveries this month", target: 5, current: deliveredThisMonth, xpBonus: 150, icon: "📦" },
      { id: "newclients3", title: "Add 3 new clients", description: "Grow your client base", target: 3, current: clientsThisMonth, xpBonus: 100, icon: "🤝" },
      { id: "fullpay4", title: "Collect 4 full payments", description: "Get fully paid on 4 orders", target: 4, current: paymentsThisMonth, xpBonus: 120, icon: "💰" },
      { id: "ontime3", title: "3 on-time deliveries", description: "Deliver 3 orders before deadline", target: 3, current: onTimeThisMonth, xpBonus: 100, icon: "⏰" },
      { id: "orders8", title: "Create 8 orders", description: "Take on 8 new orders", target: 8, current: ordersThisMonth, xpBonus: 130, icon: "✂️" },
      { id: "deliver10", title: "Deliver 10 orders", description: "A true power month", target: 10, current: deliveredThisMonth, xpBonus: 250, icon: "🔥" },
    ];

    // Pick 4 challenges based on month (rotate through pool)
    const challenges = [
      challengePool[(monthIdx * 2) % challengePool.length],
      challengePool[(monthIdx * 2 + 1) % challengePool.length],
      challengePool[(monthIdx * 2 + 2) % challengePool.length],
      challengePool[(monthIdx * 2 + 3) % challengePool.length],
    ].map((c) => ({
      ...c,
      progress: Math.min(100, Math.round((c.current / c.target) * 100)),
      completed: c.current >= c.target,
    }));

    // Add challenge bonus XP for completed challenges
    const challengeBonusXP = challenges.reduce(
      (sum, c) => sum + (c.completed ? c.xpBonus : 0),
      0
    );
    totalXP += challengeBonusXP;

    // Recalculate tier after adding challenge XP
    const finalTier = getTier(totalXP);
    const finalNextTier = getNextTier(totalXP);
    const finalXpInCurrentTier = totalXP - finalTier.minXP;
    const finalXpForNextTier = finalNextTier ? finalNextTier.minXP - finalTier.minXP : 1;
    const finalProgressPercent = finalNextTier
      ? Math.min(100, Math.round((finalXpInCurrentTier / finalXpForNextTier) * 100))
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        xp: totalXP,
        tier: {
          name: finalTier.name,
          title: finalTier.title,
          icon: finalTier.icon,
          color: finalTier.color,
        },
        nextTier: finalNextTier
          ? {
              title: finalNextTier.title,
              icon: finalNextTier.icon,
              xpNeeded: finalNextTier.minXP - totalXP,
            }
          : null,
        progress: finalProgressPercent,
        stats: {
          totalOrders,
          deliveredOrders,
          totalClients,
          onTimeRate:
            deliveredOrders > 0
              ? Math.round((onTimeDeliveries / deliveredOrders) * 100)
              : 0,
          deliveredThisMonth,
          deliveredLastMonth,
          monthsActive,
          avgOrdersPerMonth: monthsActive > 0 ? +(totalOrders / monthsActive).toFixed(1) : 0,
        },
        achievements: achievements.slice(0, 12),
        xpBreakdown: {
          orders: totalOrders * XP_VALUES.orderCreated,
          deliveries: deliveredOrders * XP_VALUES.orderDelivered,
          payments: fullPaidOrders * XP_VALUES.paymentCollectedFull + partialPaidOrders * XP_VALUES.paymentCollectedPartial,
          clients: totalClients * XP_VALUES.clientAdded,
          measurements: clientsWithMeasurements * XP_VALUES.measurementTaken,
          onTime: onTimeDeliveries * XP_VALUES.onTimeDelivery,
          portfolio: ordersWithGallery * XP_VALUES.portfolioPhoto,
          challenges: challengeBonusXP,
        },
        challenges: {
          month: currentMonth,
          items: challenges,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/designer/rank error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
