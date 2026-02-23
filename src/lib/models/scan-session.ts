import mongoose, { Schema, type Document } from "mongoose";

export interface IScanSession extends Document {
  designerId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  linkCode: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  measurements?: Record<string, number>;
  expiresAt: Date;
  createdAt: Date;
}

const ScanSessionSchema = new Schema<IScanSession>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    linkCode: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "expired"],
      default: "pending",
    },
    measurements: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

ScanSessionSchema.index({ linkCode: 1 });
ScanSessionSchema.index({ designerId: 1 });

export const ScanSession =
  mongoose.models.ScanSession || mongoose.model<IScanSession>("ScanSession", ScanSessionSchema);
