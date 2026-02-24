import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/designer/leaderboard                                              */
/*  Anonymous leaderboard — top 20 designers by XP                            */
/* -------------------------------------------------------------------------- */

const XP_VALUES = {
  orderCreated: 10,
  orderDelivered: 50,
  paymentCollectedFull: 30,
  paymentCollectedPartial: 15,
  clientAdded: 20,
  measurementTaken: 15,
  onTimeDelivery: 25,
  fiveStarMonth: 100,
  portfolioPhoto: 5,
};

const RANK_TIERS = [
  { name: "apprentice", minXP: 0, icon: "🧵", color: "#94a3b8", title: "Apprentice" },
  { name: "journeyman", minXP: 500, icon: "✂️", color: "#C75B39", title: "Journeyman" },
  { name: "craftsman", minXP: 1500, icon: "🪡", color: "#D4A853", title: "Craftsman" },
  { name: "master", minXP: 3500, icon: "👑", color: "#8B5CF6", title: "Master" },
  { name: "grandmaster", minXP: 7000, icon: "💎", color: "#059669", title: "Grandmaster" },
];

function getTier(xp: number) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (xp >= RANK_TIERS[i].minXP) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
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

    const currentDesignerId = (session.user as { id: string }).id;

    await connectDB();

    // Get all designers that have opted in or are active (have at least 1 order)
    const designers = await Designer.find({}).select("_id businessName createdAt").lean();

    const leaderboard: {
      rank: number;
      businessName: string;
      xp: number;
      tier: { icon: string; title: string; color: string };
      deliveries: number;
      isYou: boolean;
    }[] = [];

    // Calculate XP for each designer
    for (const designer of designers) {
      const did = designer._id;
      const didObj = new mongoose.Types.ObjectId(String(did));

      const [
        totalOrders,
        deliveredOrders,
        totalClients,
        clientsWithMeasurements,
        fullPaidOrders,
        partialPaidOrders,
        onTimeDeliveries,
        ordersWithGallery,
        monthlyDeliveryData,
      ] = await Promise.all([
        Order.countDocuments({ designerId: did }),
        Order.countDocuments({ designerId: did, status: "delivered" }),
        Client.countDocuments({ designerId: didObj }),
        Client.countDocuments({ designerId: didObj, measurements: { $exists: true, $ne: null } }),
        Order.countDocuments({ designerId: did, paymentStatus: "paid" }),
        Order.countDocuments({ designerId: did, paymentStatus: "partial" }),
        Order.countDocuments({
          designerId: did,
          status: "delivered",
          dueDate: { $exists: true },
          $expr: { $lte: ["$updatedAt", "$dueDate"] },
        }),
        Order.countDocuments({ designerId: did, "gallery.0": { $exists: true } }),
        Order.aggregate([
          { $match: { designerId: didObj, status: "delivered" } },
          { $group: { _id: { year: { $year: "$updatedAt" }, month: { $month: "$updatedAt" } }, count: { $sum: 1 } } },
          { $match: { count: { $gte: 5 } } },
          { $count: "fiveStarMonths" },
        ]),
      ]);

      // Skip designers with no orders at all
      if (totalOrders === 0) continue;

      const fiveStarMonths = monthlyDeliveryData[0]?.fiveStarMonths || 0;

      let xp = 0;
      xp += totalOrders * XP_VALUES.orderCreated;
      xp += deliveredOrders * XP_VALUES.orderDelivered;
      xp += fullPaidOrders * XP_VALUES.paymentCollectedFull;
      xp += partialPaidOrders * XP_VALUES.paymentCollectedPartial;
      xp += totalClients * XP_VALUES.clientAdded;
      xp += clientsWithMeasurements * XP_VALUES.measurementTaken;
      xp += onTimeDeliveries * XP_VALUES.onTimeDelivery;
      xp += fiveStarMonths * XP_VALUES.fiveStarMonth;
      xp += ordersWithGallery * XP_VALUES.portfolioPhoto;

      const tier = getTier(xp);
      leaderboard.push({
        rank: 0,
        businessName: (designer.businessName as string) || "Anonymous Designer",
        xp,
        tier: { icon: tier.icon, title: tier.title, color: tier.color },
        deliveries: deliveredOrders,
        isYou: String(did) === currentDesignerId,
      });
    }

    // Sort by XP descending and assign ranks
    leaderboard.sort((a, b) => b.xp - a.xp);
    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: leaderboard.slice(0, 20),
        yourRank: leaderboard.find((e) => e.isYou)?.rank || null,
        totalDesigners: leaderboard.length,
      },
    });
  } catch (error) {
    console.error("GET /api/designer/leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
