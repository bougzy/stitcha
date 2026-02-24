import mongoose, { Schema, type Document } from "mongoose";

export interface IStyleTip extends Document {
  title: string;
  content: string;
  category: "technique" | "trend" | "fabric" | "business" | "inspiration";
  tags: string[];
  season?: string;
  viewCount: number;
  bookmarkCount: number;
  createdAt: Date;
}

const StyleTipSchema = new Schema<IStyleTip>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["technique", "trend", "fabric", "business", "inspiration"],
      required: true,
      index: true,
    },
    tags: [{ type: String }],
    season: { type: String },
    viewCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StyleTipSchema.index({ tags: 1 });
StyleTipSchema.index({ category: 1, createdAt: -1 });

export const StyleTip =
  mongoose.models.StyleTip || mongoose.model<IStyleTip>("StyleTip", StyleTipSchema);

/* -------------------------------------------------------------------------- */
/*  Bookmark sub-document stored on the Designer model                        */
/*  Alternatively: separate collection for bookmarks                          */
/* -------------------------------------------------------------------------- */

export interface IStyleBookmark extends Document {
  designerId: mongoose.Types.ObjectId;
  tipId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StyleBookmarkSchema = new Schema<IStyleBookmark>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    tipId: { type: Schema.Types.ObjectId, ref: "StyleTip", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StyleBookmarkSchema.index({ designerId: 1, tipId: 1 }, { unique: true });

export const StyleBookmark =
  mongoose.models.StyleBookmark || mongoose.model<IStyleBookmark>("StyleBookmark", StyleBookmarkSchema);
