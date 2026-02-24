import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  designerId: mongoose.Types.ObjectId;
  type: "overdue_payment" | "deadline_approaching" | "event_prep" | "milestone" | "system";
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    type: {
      type: String,
      enum: ["overdue_payment", "deadline_approaching", "event_prep", "milestone", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NotificationSchema.index({ designerId: 1, read: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
