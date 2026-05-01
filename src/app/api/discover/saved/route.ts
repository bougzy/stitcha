import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { FeedLike } from "@/lib/models/feed-like";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/discover/saved                                                    */
/*                                                                              */
/*  Logged-in only. Returns the posts the current user has liked, ordered     */
/*  newest-first by like time. Mirrors the shape of /api/discover so the       */
/*  client can swap data sources without re-rendering.                         */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const likes = await FeedLike.find({ userId })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    const orderIds = likes.map((l) => (l as Record<string, unknown>).orderId);

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, data: { posts: [], nextCursor: null } });
    }

    const orders = await Order.find({
      _id: { $in: orderIds },
      featuredInFeed: true,
      status: "delivered",
      isDeleted: { $ne: true },
      "gallery.0": { $exists: true },
    })
      .select("title garmentType gallery feedCaption featuredAt designerId feedLikes createdAt")
      .lean();

    const orderById = new Map(
      orders.map((o) => [String((o as Record<string, unknown>)._id), o as Record<string, unknown>]),
    );

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

    const posts = likes
      .map((like) => {
        const order = orderById.get(String((like as Record<string, unknown>).orderId));
        if (!order) return null;
        const designer = designerMap.get(String(order.designerId));
        if (!designer) return null;
        return {
          _id: String(order._id),
          title: order.title,
          garmentType: order.garmentType,
          caption: order.feedCaption ?? null,
          images: (order.gallery as string[]) ?? [],
          featuredAt: order.featuredAt ?? order.createdAt,
          likeCount: (order.feedLikes as number) ?? 0,
          likedByMe: true,
          designer: {
            id: String(designer._id),
            name: designer.name,
            businessName: designer.businessName,
            city: designer.city ?? null,
            state: designer.state ?? null,
            avatar: designer.avatar ?? null,
          },
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return NextResponse.json({ success: true, data: { posts, nextCursor: null } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load saved posts" },
      { status: 500 },
    );
  }
}
