import mongoose, { Schema, type Document } from "mongoose";

/* -------------------------------------------------------------------------- */
/*  AdminNotification                                                           */
/*                                                                              */
/*  Admin-scoped notifications. Separate from Designer Notifications because  */
/*  there's no admin Designer record. Anyone with a valid admin cookie reads */
/*  the same global queue.                                                     */
/*                                                                              */
/*  Severity:                                                                   */
/*    "action_required" — admin must do something (verify a manual payment).  */
/*    "info"            — heads-up only (a Paystack payment auto-activated). */
/*    "warning"         — system alert (cron failure, suspended designer…).   */
/* -------------------------------------------------------------------------- */

export type AdminNotificationSeverity = "action_required" | "info" | "warning";

export type AdminNotificationKind =
  | "manual_payment_submitted"
  | "paystack_payment_succeeded"
  | "designer_signup"
  | "broadcast_failed"
  | "system";

export interface IAdminNotification extends Document {
  kind: AdminNotificationKind;
  severity: AdminNotificationSeverity;
  title: string;
  message: string;
  link?: string;
  /** Loose context payload — used by the bell dropdown to render details. */
  meta?: Record<string, unknown>;
  /** Optional designer this notification refers to. */
  designerId?: mongoose.Types.ObjectId;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

const AdminNotificationSchema = new Schema<IAdminNotification>(
  {
    kind: {
      type: String,
      enum: [
        "manual_payment_submitted",
        "paystack_payment_succeeded",
        "designer_signup",
        "broadcast_failed",
        "system",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["action_required", "info", "warning"],
      default: "info",
      index: true,
    },
    title:   { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    link:    { type: String, maxlength: 200 },
    meta:    { type: Schema.Types.Mixed },
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", index: true },
    read:   { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Bell query: unread first, newest first
AdminNotificationSchema.index({ read: 1, createdAt: -1 });

export const AdminNotification =
  (mongoose.models.AdminNotification as mongoose.Model<IAdminNotification>) ||
  mongoose.model<IAdminNotification>("AdminNotification", AdminNotificationSchema);
