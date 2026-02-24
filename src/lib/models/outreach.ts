import mongoose, { Schema, type Document } from "mongoose";

export interface IOutreach extends Document {
  designerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  type: "whatsapp" | "call" | "note";
  message?: string;
  sentAt: Date;
}

const OutreachSchema = new Schema<IOutreach>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    type: { type: String, enum: ["whatsapp", "call", "note"], required: true },
    message: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

OutreachSchema.index({ designerId: 1, clientId: 1, sentAt: -1 });

export const Outreach =
  mongoose.models.Outreach || mongoose.model<IOutreach>("Outreach", OutreachSchema);
