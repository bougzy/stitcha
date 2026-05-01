import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { FeedLike } from "@/lib/models/feed-like";

/* -------------------------------------------------------------------------- */
/*  GET /api/discover/trending                                                 */
/*                                                                              */
/*  Returns up to 8 "hot" featured posts.                                      */
/*                                                                              */
/*  Strategy (graceful as data grows):                                         */
/*   1. Try posts featured in the last 14 days, sorted by feedLikes DESC.     */
/*   2. If that's empty, fall back to all-time featured posts with likes > 0. */
/*   3. If still empty, return [] — caller hides the section entirely.         */
/*                                                                              */
/*  Anonymous likes count toward `feedLikes`, so trending reflects all         */
/*  visitors — not just signed-in designers.                                   */
/* -------------------------------------------------------------------------- */

const TRENDING_WINDOW_DAYS = 14;
const TRENDING_LIMIT = 8;

const baseSelect = "title garmentType gallery feedCaption featuredAt designerId feedLikes createdAt";

export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const baseFilter = {
      featuredInFeed: true,
      status: "delivered",
      isDeleted: { $ne: true },
      "gallery.0": { $exists: true },
    } as const;

    // 1) Recent + sorted by likes
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    let orders = await Order.find({
      ...baseFilter,
      featuredAt: { $gte: since },
      feedLikes: { $gt: 0 },
    })
      .select(baseSelect)
      .sort({ feedLikes: -1, featuredAt: -1 })
      .limit(TRENDING_LIMIT)
      .lean();

    // 2) Fallback: all-time, any likes
    if (orders.length === 0) {
      orders = await Order.find({
        ...baseFilter,
        feedLikes: { $gt: 0 },
      })
        .select(baseSelect)
        .sort({ feedLikes: -1, featuredAt: -1 })
        .limit(TRENDING_LIMIT)
        .lean();
    }

    if (orders.length === 0) {
      return NextResponse.json({ success: true, data: { posts: [] } });
    }

    // Filter to public-profile designers only (consistent with /api/discover)
    const designerIds = Array.from(
      new Set(orders.map((o) => String((o as Record<string, unknown>).designerId))),
    );
    const designers = await Designer.find({
      _id: { $in: designerIds },
      publicProfile: true,
    })
      .select("_id name businessName city state avatar")
      .lean();
    const designerMap = new Map(
      designers.map((d) => [String((d as Record<string, unknown>)._id), d as Record<string, unknown>]),
    );

    // Per-post likedByMe (signed-in only)
    let likedSet: Set<string> = new Set();
    if (userId) {
      const likes = await FeedLike.find({
        userId,
        orderId: { $in: orders.map((o) => (o as Record<string, unknown>)._id) },
      })
        .select("orderId")
        .lean();
      likedSet = new Set(likes.map((l) => String((l as Record<string, unknown>).orderId)));
    }

    const posts = orders
      .map((order) => {
        const o = order as Record<string, unknown>;
        const d = designerMap.get(String(o.designerId));
        if (!d) return null;
        return {
          _id: String(o._id),
          title: o.title,
          garmentType: o.garmentType,
          caption: o.feedCaption ?? null,
          images: (o.gallery as string[]) ?? [],
          featuredAt: o.featuredAt ?? o.createdAt,
          likeCount: (o.feedLikes as number) ?? 0,
          likedByMe: likedSet.has(String(o._id)),
          designer: {
            id: String(d._id),
            name: d.name,
            businessName: d.businessName,
            city: d.city ?? null,
            state: d.state ?? null,
            avatar: d.avatar ?? null,
          },
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return NextResponse.json({ success: true, data: { posts } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load trending" },
      { status: 500 },
    );
  }
}
