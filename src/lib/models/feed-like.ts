import mongoose, { Schema, type Document } from "mongoose";

/* -------------------------------------------------------------------------- */
/*  FeedLike — one record per (user, order) pair.                              */
/*                                                                              */
/*  Used only for SIGNED-IN designers so they can:                             */
/*    1. See a "My saves" view of work they've liked                           */
/*    2. Have their like state persist across devices                          */
/*                                                                              */
/*  Anonymous likes are stored only as a counter on `Order.feedLikes` plus a   */
/*  localStorage flag in the visitor's browser to dedupe.                      */
/* -------------------------------------------------------------------------- */

export interface IFeedLike extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FeedLikeSchema = new Schema<IFeedLike>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order",    required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One like per user/order pair
FeedLikeSchema.index({ userId: 1, orderId: 1 }, { unique: true });
// "My saves" feed: list a user's likes newest-first
FeedLikeSchema.index({ userId: 1, createdAt: -1 });

export const FeedLike =
  mongoose.models.FeedLike || mongoose.model<IFeedLike>("FeedLike", FeedLikeSchema);
