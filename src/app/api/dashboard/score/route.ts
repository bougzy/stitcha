import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/dashboard/score                                                   */
/*  Returns the designer's Stitcha Score (0-100) composite business health    */
/* -------------------------------------------------------------------------- */

interface ScoreComponent {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  tip: string;
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    await connectDB();

    const [
      designer,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      activeOrders,
      onTimeDeliveries,
      lateDeliveries,
      totalClients,
      recentClients,
      fullyPaidOrders,
      partialPaidOrders,
      unpaidOrders,
      totalRevenue,
      totalCollected,
      ordersWithGallery,
      recentOrderCount,
      overdueOrders,
    ] = await Promise.all([
      Designer.findById(designerId).select("bio specialties publicProfile businessName"),
      Order.countDocuments({ designerId }),
      Order.countDocuments({ designerId, status: "delivered" }),
      Order.countDocuments({ designerId, status: "cancelled" }),
      Order.countDocuments({
        designerId,
        status: { $nin: ["delivered", "cancelled"] },
      }),
      // On-time deliveries
      Order.countDocuments({
        designerId,
        status: "delivered",
        dueDate: { $exists: true },
        $expr: { $lte: ["$updatedAt", "$dueDate"] },
      }),
      // Late deliveries
      Order.countDocuments({
        designerId,
        status: "delivered",
        dueDate: { $exists: true },
        $expr: { $gt: ["$updatedAt", "$dueDate"] },
      }),
      Client.countDocuments({ designerId: designerObjectId }),
      Client.countDocuments({
        designerId: designerObjectId,
        createdAt: { $gte: ninetyDaysAgo },
      }),
      Order.countDocuments({ designerId, paymentStatus: "paid" }),
      Order.countDocuments({ designerId, paymentStatus: "partial" }),
      Order.countDocuments({
        designerId,
        paymentStatus: { $in: ["unpaid", "overdue"] },
      }),
      Order.aggregate([
        { $match: { designerId: designerObjectId, status: { $nin: ["cancelled"] } } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      Order.aggregate([
        { $match: { designerId: designerObjectId, status: { $nin: ["cancelled"] } } },
        { $group: { _id: null, total: { $sum: "$depositPaid" } } },
      ]),
      Order.countDocuments({ designerId, "gallery.0": { $exists: true } }),
      Order.countDocuments({ designerId, createdAt: { $gte: thirtyDaysAgo } }),
      Order.countDocuments({
        designerId,
        dueDate: { $lt: now },
        status: { $nin: ["delivered", "cancelled"] },
      }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const collected = totalCollected[0]?.total || 0;

    const components: ScoreComponent[] = [];

    // 1. Payment Collection Rate (0-25 points)
    const collectionRate = revenue > 0 ? (collected / revenue) * 100 : 100;
    const paymentScore = Math.round(Math.min(25, (collectionRate / 100) * 25));
    components.push({
      name: "Payment Collection",
      score: paymentScore,
      maxScore: 25,
      description: `${Math.round(collectionRate)}% of revenue collected`,
      tip:
        paymentScore < 20
          ? "Follow up on outstanding payments. Use WhatsApp reminders."
          : "Great collection rate! Keep it up.",
    });

    // 2. On-Time Delivery Rate (0-25 points)
    const totalDeliveriesWithDue = onTimeDeliveries + lateDeliveries;
    const onTimeRate =
      totalDeliveriesWithDue > 0
        ? (onTimeDeliveries / totalDeliveriesWithDue) * 100
        : totalOrders === 0
        ? 100
        : 50;
    const deliveryScore = Math.round(Math.min(25, (onTimeRate / 100) * 25));
    components.push({
      name: "On-Time Delivery",
      score: deliveryScore,
      maxScore: 25,
      description:
        totalDeliveriesWithDue > 0
          ? `${Math.round(onTimeRate)}% of orders delivered on time`
          : "Set due dates to track delivery performance",
      tip:
        deliveryScore < 20
          ? "Set realistic due dates. Build in 2-day buffers."
          : "Excellent punctuality! Clients trust you.",
    });

    // 3. Client Retention (0-20 points)
    const retentionBase = totalClients > 0 ? Math.min(1, recentClients / Math.max(1, totalClients * 0.3)) : 0;
    const hasRepeatClients = totalOrders > totalClients;
    const retentionScore = Math.round(
      Math.min(20, (retentionBase * 10) + (hasRepeatClients ? 10 : 0))
    );
    components.push({
      name: "Client Retention",
      score: retentionScore,
      maxScore: 20,
      description: `${recentClients} new clients in 90 days. ${
        hasRepeatClients ? "Repeat clients detected." : "Build repeat business."
      }`,
      tip:
        retentionScore < 15
          ? "Reach out to inactive clients. Use the Heartbeat feature."
          : "Strong client relationships! Keep nurturing them.",
    });

    // 4. Profile Completeness (0-10 points)
    const designerData = designer as Record<string, unknown> | null;
    let profileScore = 0;
    if (designerData?.businessName) profileScore += 2;
    if (designerData?.bio) profileScore += 2;
    if (designerData?.specialties && (designerData.specialties as string[]).length > 0) profileScore += 2;
    if (designerData?.publicProfile) profileScore += 2;
    if (ordersWithGallery > 0) profileScore += 2;
    profileScore = Math.min(10, profileScore);
    components.push({
      name: "Profile Completeness",
      score: profileScore,
      maxScore: 10,
      description: `${profileScore * 10}% complete`,
      tip:
        profileScore < 8
          ? "Complete your profile: add bio, specialties, and enable public profile."
          : "Profile looks great!",
    });

    // 5. Order Volume & Activity (0-20 points)
    const volumeBase = Math.min(10, recentOrderCount * 2); // Up to 10 pts for recent orders
    const activeBase = Math.min(5, activeOrders); // Up to 5 pts for active pipeline
    const noOverdue = overdueOrders === 0 ? 5 : Math.max(0, 5 - overdueOrders * 2);
    const volumeScore = Math.min(20, volumeBase + activeBase + noOverdue);
    components.push({
      name: "Business Activity",
      score: volumeScore,
      maxScore: 20,
      description: `${recentOrderCount} orders in 30 days. ${activeOrders} active. ${overdueOrders} overdue.`,
      tip:
        volumeScore < 15
          ? "Increase visibility: share your portfolio, ask for referrals."
          : "Business is thriving!",
    });

    const totalScore = components.reduce((sum, c) => sum + c.score, 0);

    // Determine grade
    let grade: "A+" | "A" | "B" | "C" | "D" | "F";
    if (totalScore >= 90) grade = "A+";
    else if (totalScore >= 80) grade = "A";
    else if (totalScore >= 65) grade = "B";
    else if (totalScore >= 50) grade = "C";
    else if (totalScore >= 35) grade = "D";
    else grade = "F";

    // Weekly challenges
    const challenges = [];
    if (paymentScore < 20) {
      challenges.push({
        title: "Collect 2 outstanding payments",
        reward: "+5 score boost",
        type: "payment",
      });
    }
    if (overdueOrders > 0) {
      challenges.push({
        title: `Deliver ${Math.min(overdueOrders, 2)} overdue order${overdueOrders > 1 ? "s" : ""}`,
        reward: "+3 score boost",
        type: "delivery",
      });
    }
    if (profileScore < 10) {
      challenges.push({
        title: "Complete your profile",
        reward: "+2 score boost",
        type: "profile",
      });
    }
    if (recentOrderCount < 3) {
      challenges.push({
        title: "Create a new order this week",
        reward: "+2 score boost",
        type: "activity",
      });
    }
    if (ordersWithGallery === 0) {
      challenges.push({
        title: "Add a photo to your portfolio",
        reward: "+1 score boost",
        type: "portfolio",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        score: totalScore,
        grade,
        components,
        challenges: challenges.slice(0, 4),
        stats: {
          totalOrders,
          deliveredOrders,
          totalClients,
          revenue,
          collected,
          collectionRate: Math.round(collectionRate),
          onTimeRate: Math.round(onTimeRate),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/score error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
