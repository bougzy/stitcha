import mongoose, { Schema, type Document } from "mongoose";

export interface IActivityLog extends Document {
  designerId: mongoose.Types.ObjectId;
  action: string;
  entity: "client" | "order" | "payment" | "measurement" | "settings";
  entityId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    action: { type: String, required: true },
    entity: { type: String, enum: ["client", "order", "payment", "measurement", "settings"], required: true },
    entityId: { type: String },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ActivityLogSchema.index({ designerId: 1, createdAt: -1 });
ActivityLogSchema.index({ entity: 1, entityId: 1 });

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

/**
 * Helper to log an activity. Fire-and-forget — does not throw on failure.
 */
export async function logActivity(params: {
  designerId: string;
  action: string;
  entity: IActivityLog["entity"];
  entityId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await ActivityLog.create(params);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
