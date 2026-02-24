import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Outreach } from "@/lib/models/outreach";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/heartbeat                                                 */
/*  Returns client relationship health data with nurturing suggestions         */
/* -------------------------------------------------------------------------- */

interface ClientHeartbeat {
  clientId: string;
  name: string;
  phone: string;
  temperature: "hot" | "warm" | "cold" | "dormant";
  daysSinceLastOrder: number | null;
  daysSinceLastContact: number | null;
  totalOrders: number;
  totalSpent: number;
  outstandingBalance: number;
  lastOrderTitle: string | null;
  suggestedAction: string;
  suggestedMessage: string;
  lastOutreachDate: string | null;
  lastOutreachType: string | null;
  isRepeatClient: boolean;
  paymentReliability: "excellent" | "good" | "poor";
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

    // Get all clients with their order data
    const clientsWithOrders = await Client.aggregate([
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
        $project: {
          name: 1,
          phone: 1,
          createdAt: 1,
          orders: {
            _id: 1,
            title: 1,
            status: 1,
            price: 1,
            depositPaid: 1,
            createdAt: 1,
            updatedAt: 1,
            dueDate: 1,
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Fetch latest outreach per client in a single query
    const latestOutreach = await Outreach.aggregate([
      { $match: { designerId: designerObjectId } },
      { $sort: { sentAt: -1 } },
      { $group: { _id: "$clientId", lastType: { $first: "$type" }, lastDate: { $first: "$sentAt" } } },
    ]);
    const outreachMap = new Map(
      latestOutreach.map((o: { _id: mongoose.Types.ObjectId; lastType: string; lastDate: Date }) => [
        String(o._id),
        { type: o.lastType, date: o.lastDate },
      ])
    );

    const heartbeats: ClientHeartbeat[] = [];

    for (const client of clientsWithOrders) {
      const orders = client.orders || [];
      const totalOrders = orders.length;
      const totalSpent = orders.reduce(
        (sum: number, o: { price: number }) => sum + (o.price || 0),
        0
      );
      const totalPaid = orders.reduce(
        (sum: number, o: { depositPaid: number }) => sum + (o.depositPaid || 0),
        0
      );
      const outstandingBalance = totalSpent - totalPaid;

      // Find most recent order
      const sortedOrders = [...orders].sort(
        (a: { createdAt: Date }, b: { createdAt: Date }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastOrder = sortedOrders[0] || null;
      const lastOrderDate = lastOrder ? new Date(lastOrder.createdAt) : null;
      const daysSinceLastOrder = lastOrderDate
        ? Math.floor(
            (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      // Richer scoring: factor in repeat orders, payment reliability, outreach
      const isRepeatClient = totalOrders >= 2;
      const paymentRatio = totalSpent > 0 ? totalPaid / totalSpent : 1;
      const paymentReliability: "excellent" | "good" | "poor" =
        paymentRatio >= 0.9 ? "excellent" : paymentRatio >= 0.6 ? "good" : "poor";

      // Determine base temperature from time
      let temperature: "hot" | "warm" | "cold" | "dormant";
      if (daysSinceLastOrder === null) {
        temperature = "cold";
      } else if (daysSinceLastOrder <= 14) {
        temperature = "hot";
      } else if (daysSinceLastOrder <= 45) {
        temperature = "warm";
      } else if (daysSinceLastOrder <= 90) {
        temperature = "cold";
      } else {
        temperature = "dormant";
      }

      // Boost temperature for repeat/high-value/reliable clients
      if (temperature === "cold" && isRepeatClient && paymentReliability !== "poor") {
        temperature = "warm"; // repeat clients with good payment stay warmer
      }
      if (temperature === "warm" && totalSpent > 100000 && paymentReliability === "excellent") {
        temperature = "hot"; // high-value reliable clients are always hot
      }

      // Has active order? Override to hot
      const hasActive = orders.some(
        (o: { status: string }) =>
          !["delivered", "cancelled"].includes(o.status)
      );
      if (hasActive) temperature = "hot";

      // Outreach data
      const clientOutreach = outreachMap.get(String(client._id));
      const lastOutreachDate = clientOutreach?.date ? new Date(clientOutreach.date).toISOString() : null;
      const lastOutreachType = clientOutreach?.type || null;
      const daysSinceOutreach = clientOutreach?.date
        ? Math.floor((now.getTime() - new Date(clientOutreach.date).getTime()) / 86400000)
        : null;

      // Generate suggested action and message
      let suggestedAction = "";
      let suggestedMessage = "";

      if (hasActive) {
        suggestedAction = "Send progress update";
        const activeOrder = orders.find(
          (o: { status: string }) =>
            !["delivered", "cancelled"].includes(o.status)
        );
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! Quick update on your ${activeOrder?.title || "order"} — it's coming along nicely. I'll share photos soon!`;
      } else if (temperature === "dormant") {
        suggestedAction = "Re-engage with special offer";
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! It's been a while and I've been thinking of you. I have some beautiful new fabrics that would suit you perfectly. Would you like to see them?`;
      } else if (temperature === "cold") {
        suggestedAction = "Check in and reconnect";
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! How have you been? I just wanted to check in. If you have any upcoming events, I'd love to create something special for you.`;
      } else if (temperature === "warm") {
        suggestedAction = "Share new styles";
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! I've been working on some new designs I think you'd love. Want me to send you some photos for inspiration?`;
      } else if (outstandingBalance > 0) {
        suggestedAction = "Follow up on payment";
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! Just a friendly reminder about the outstanding balance of \u20A6${outstandingBalance.toLocaleString()}. Please let me know when it's convenient to settle. Thank you!`;
      } else {
        suggestedAction = "Thank and request referral";
        suggestedMessage = `Hi ${client.name.split(" ")[0]}! Thank you for your continued support. If you know anyone looking for a great designer, I'd appreciate the referral!`;
      }

      heartbeats.push({
        clientId: String(client._id),
        name: client.name,
        phone: client.phone,
        temperature,
        daysSinceLastOrder,
        daysSinceLastContact: daysSinceOutreach ?? daysSinceLastOrder,
        totalOrders,
        totalSpent,
        outstandingBalance: Math.max(0, outstandingBalance),
        lastOrderTitle: lastOrder?.title || null,
        suggestedAction,
        suggestedMessage,
        lastOutreachDate,
        lastOutreachType,
        isRepeatClient,
        paymentReliability,
      });
    }

    // Sort: dormant first, then cold, warm, hot
    const tempOrder = { dormant: 0, cold: 1, warm: 2, hot: 3 };
    heartbeats.sort(
      (a, b) => tempOrder[a.temperature] - tempOrder[b.temperature]
    );

    // Summary stats
    const summary = {
      total: heartbeats.length,
      hot: heartbeats.filter((h) => h.temperature === "hot").length,
      warm: heartbeats.filter((h) => h.temperature === "warm").length,
      cold: heartbeats.filter((h) => h.temperature === "cold").length,
      dormant: heartbeats.filter((h) => h.temperature === "dormant").length,
      needsAttention: heartbeats.filter(
        (h) => h.temperature === "cold" || h.temperature === "dormant"
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        clients: heartbeats,
      },
    });
  } catch (error) {
    console.error("GET /api/clients/heartbeat error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
