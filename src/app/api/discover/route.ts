import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { FeedLike } from "@/lib/models/feed-like";

/* -------------------------------------------------------------------------- */
/*  GET /api/discover                                                          */
/*                                                                              */
/*  Public discovery feed.                                                     */
/*                                                                              */
/*  Returns paginated "posts" — each post is a delivered order with at least  */
/*  one gallery image, that the designer has explicitly featured AND whose    */
/*  designer has `publicProfile: true`.                                        */
/*                                                                              */
/*  Query params:                                                              */
/*    cursor      ISO date string from previous response (pagination)         */
/*    limit       page size (max 30, default 20)                              */
/*    garmentType filter, e.g. "dress" / "agbada" / "trousers"                */
/*    state       filter on designer.state                                     */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const { searchParams } = new URL(request.url);
    const cursorRaw = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 30);
    const garmentType = searchParams.get("garmentType");
    const state = searchParams.get("state");

    // Filter: featured + delivered + has gallery
    const orderFilter: Record<string, unknown> = {
      featuredInFeed: true,
      status: "delivered",
      isDeleted: { $ne: true },
      "gallery.0": { $exists: true },
    };
    if (garmentType) orderFilter.garmentType = garmentType;
    if (cursorRaw) {
      const d = new Date(cursorRaw);
      if (!isNaN(d.getTime())) orderFilter.featuredAt = { $lt: d };
    }

    // Pre-compute the set of designer IDs with a public profile (and optional state)
    const designerFilter: Record<string, unknown> = { publicProfile: true };
    if (state) designerFilter.state = state;
    const publicDesigners = await Designer.find(designerFilter)
      .select("_id name businessName city state avatar")
      .lean();
    const designerMap = new Map(
      publicDesigners.map((d) => {
        const dd = d as Record<string, unknown>;
        return [String(dd._id), dd];
      }),
    );
    if (designerMap.size === 0) {
      return NextResponse.json({
        success: true,
        data: { posts: [], nextCursor: null },
      });
    }

    orderFilter.designerId = { $in: Array.from(designerMap.keys()) };

    const orders = await Order.find(orderFilter)
      .select("title description garmentType gallery feedCaption featuredAt designerId feedLikes createdAt")
      .sort({ featuredAt: -1, createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = orders.length > limit;
    const slice = hasMore ? orders.slice(0, limit) : orders;

    // For signed-in users: which of these orders has the user already liked?
    let likedSet: Set<string> = new Set();
    if (userId && slice.length > 0) {
      const likes = await FeedLike.find({
        userId,
        orderId: { $in: slice.map((o) => (o as Record<string, unknown>)._id) },
      })
        .select("orderId")
        .lean();
      likedSet = new Set(likes.map((l) => String((l as Record<string, unknown>).orderId)));
    }

    const posts = slice.map((order) => {
      const o = order as Record<string, unknown>;
      const d = designerMap.get(String(o.designerId)) as Record<string, unknown> | undefined;
      return {
        _id: String(o._id),
        title: o.title,
        garmentType: o.garmentType,
        caption: o.feedCaption ?? null,
        images: (o.gallery as string[]) ?? [],
        featuredAt: o.featuredAt ?? o.createdAt,
        likeCount: (o.feedLikes as number) ?? 0,
        likedByMe: likedSet.has(String(o._id)),
        designer: d
          ? {
              id: String(d._id),
              name: d.name,
              businessName: d.businessName,
              city: d.city ?? null,
              state: d.state ?? null,
              avatar: d.avatar ?? null,
            }
          : null,
      };
    });

    const nextCursor = hasMore
      ? new Date(slice[slice.length - 1].featuredAt as string).toISOString()
      : null;

    // Bump impressions for the rows we're about to render. Fire-and-forget;
    // a failed counter bump shouldn't block the feed.
    if (slice.length > 0) {
      Order.updateMany(
        { _id: { $in: slice.map((o) => (o as Record<string, unknown>)._id) } },
        { $inc: { feedImpressions: 1 } },
      ).catch(() => { /* ignore */ });
    }

    return NextResponse.json({ success: true, data: { posts, nextCursor } });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load feed",
      },
      { status: 500 },
    );
  }
}
