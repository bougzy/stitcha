import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { FeedLike } from "@/lib/models/feed-like";

/* -------------------------------------------------------------------------- */
/*  GET /api/dashboard/insights                                                */
/*                                                                              */
/*  Returns the current designer's Discover-feed performance:                  */
/*    • Per-piece: title, hero image, garment, totalLikes, likesThisWeek,      */
/*      impressions, featuredAt.                                                */
/*    • Aggregates: totalFeatured, totalLikes, totalLikesThisWeek,             */
/*      totalImpressions.                                                       */
/*                                                                              */
/*  "Likes this week" counts only signed-in saves (FeedLike documents) since   */
/*  anonymous likes are stored as a counter without timestamps.                */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1) All featured posts owned by the current designer
    const orders = await Order.find({
      designerId: userId,
      featuredInFeed: true,
      isDeleted: { $ne: true },
    })
      .select("title garmentType gallery feedCaption feedLikes feedImpressions featuredAt status")
      .sort({ featuredAt: -1 })
      .lean();

    const orderIds = orders.map((o) => (o as Record<string, unknown>)._id as Types.ObjectId);

    // 2) "Likes this week" — count FeedLike rows per orderId in the last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekly: { _id: Types.ObjectId; count: number }[] =
      orderIds.length === 0
        ? []
        : await FeedLike.aggregate([
            { $match: { orderId: { $in: orderIds }, createdAt: { $gte: since } } },
            { $group: { _id: "$orderId", count: { $sum: 1 } } },
          ]);
    const weeklyMap = new Map(weekly.map((w) => [String(w._id), w.count]));

    // 3) Build per-piece rows
    const pieces = orders.map((order) => {
      const o = order as Record<string, unknown>;
      const id = String(o._id);
      const totalLikes = (o.feedLikes as number) ?? 0;
      return {
        id,
        title: o.title as string,
        garmentType: o.garmentType as string,
        heroImage: ((o.gallery as string[] | undefined) ?? [])[0] ?? null,
        caption: (o.feedCaption as string | undefined) ?? null,
        featuredAt: o.featuredAt ?? null,
        status: o.status as string,
        totalLikes,
        likesThisWeek: weeklyMap.get(id) ?? 0,
        impressions: (o.feedImpressions as number) ?? 0,
      };
    });

    // 4) Aggregates
    const totals = pieces.reduce(
      (acc, p) => {
        acc.totalLikes += p.totalLikes;
        acc.totalLikesThisWeek += p.likesThisWeek;
        acc.totalImpressions += p.impressions;
        return acc;
      },
      { totalLikes: 0, totalLikesThisWeek: 0, totalImpressions: 0 },
    );

    // Sort top movers — useful for "what's hot right now"
    const topThisWeek = [...pieces]
      .filter((p) => p.likesThisWeek > 0)
      .sort((a, b) => b.likesThisWeek - a.likesThisWeek)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        totalFeatured: pieces.length,
        ...totals,
        pieces,
        topThisWeek,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load insights" },
      { status: 500 },
    );
  }
}
