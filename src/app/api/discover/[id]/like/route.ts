import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { FeedLike } from "@/lib/models/feed-like";
import { Notification } from "@/lib/models/notification";

/* Like-count milestones that trigger a notification to the post's designer. */
const LIKE_MILESTONES = [10, 50, 100, 250, 500, 1000] as const;

/* -------------------------------------------------------------------------- */
/*  /api/discover/[id]/like                                                    */
/*                                                                              */
/*  POST   → like a featured post                                              */
/*           - Anonymous: increments `Order.feedLikes`                         */
/*           - Signed-in: also creates a FeedLike record (idempotent)          */
/*                                                                              */
/*  DELETE → unlike (signed-in only — anonymous likes are fire-and-forget)     */
/* -------------------------------------------------------------------------- */

async function loadFeaturedOrder(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const order = await Order.findOne({
    _id: id,
    featuredInFeed: true,
    isDeleted: { $ne: true },
  });
  return order;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    await connectDB();

    const order = await loadFeaturedOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    let alreadyLiked = false;

    if (userId) {
      // Idempotent insert — the unique index handles races
      try {
        await FeedLike.create({ userId, orderId: id });
      } catch (err) {
        // Duplicate-key means user already liked it; treat as a no-op
        if ((err as { code?: number }).code === 11000) {
          alreadyLiked = true;
        } else {
          throw err;
        }
      }
    }

    let newLikeCount: number = order.feedLikes ?? 0;
    if (!alreadyLiked) {
      // Atomic increment + return the new count so we can detect milestones.
      const updated = await Order.findOneAndUpdate(
        { _id: id },
        { $inc: { feedLikes: 1 } },
        { new: true, projection: { feedLikes: 1, feedLikeMilestones: 1, designerId: 1, title: 1 } },
      ).lean();

      if (updated) {
        const u = updated as Record<string, unknown>;
        newLikeCount = (u.feedLikes as number) ?? newLikeCount + 1;
        const reached = (u.feedLikeMilestones as number[] | undefined) ?? [];

        // Did we just cross a milestone we haven't notified for yet?
        const milestone = LIKE_MILESTONES.find(
          (m) => newLikeCount >= m && !reached.includes(m),
        );

        if (milestone) {
          // Mark as reached + create the notification (fire and forget for both)
          Order.updateOne(
            { _id: id },
            { $addToSet: { feedLikeMilestones: milestone } },
          ).catch(() => { /* ignore */ });

          Notification.create({
            designerId: u.designerId,
            type: "milestone",
            title: `🎉 ${milestone} likes on Discover!`,
            message: `Your "${(u.title as string) ?? "featured piece"}" just crossed ${milestone} likes on the Discover feed. Keep posting!`,
            link: "/insights",
          }).catch(() => { /* ignore */ });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        likeCount: newLikeCount,
        likedByMe: !!userId,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to like" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to remove a like" },
        { status: 401 },
      );
    }

    await connectDB();

    const order = await loadFeaturedOrder(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const removed = await FeedLike.deleteOne({ userId, orderId: id });
    if (removed.deletedCount > 0) {
      // Decrement but never below zero
      await Order.updateOne(
        { _id: id, feedLikes: { $gt: 0 } },
        { $inc: { feedLikes: -1 } },
      );
    }

    const fresh = await Order.findById(id).select("feedLikes").lean();
    return NextResponse.json({
      success: true,
      data: {
        likeCount: ((fresh as Record<string, unknown> | null)?.feedLikes as number) ?? 0,
        likedByMe: false,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to unlike" },
      { status: 500 },
    );
  }
}
