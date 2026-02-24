import mongoose, { Schema, Document } from "mongoose";

export interface IXPEvent extends Document {
  designerId: mongoose.Types.ObjectId;
  action: string;
  xp: number;
  description: string;
  createdAt: Date;
}

const XPEventSchema = new Schema<IXPEvent>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    action: { type: String, required: true },
    xp: { type: Number, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

XPEventSchema.index({ designerId: 1, createdAt: -1 });

export const XPEvent =
  mongoose.models.XPEvent || mongoose.model<IXPEvent>("XPEvent", XPEventSchema);
