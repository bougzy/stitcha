import mongoose, { Schema, type Document } from "mongoose";

/* -------------------------------------------------------------------------- */
/*  BroadcastJob                                                                */
/*                                                                              */
/*  Single source of truth for every broadcast (scheduled OR immediate, SMS   */
/*  OR WhatsApp queue). Powers /broadcast/history and the schedule cron.      */
/*                                                                              */
/*  Lifecycle:                                                                  */
/*    pending  → scheduled for the future, waiting for cron tick              */
/*    ready    → cron has fired (WhatsApp only) — designer must complete the */
/*               in-app queue                                                  */
/*    running  → SMS path is mid-flight                                        */
/*    complete → finished (success or partial failure)                         */
/*    cancelled → designer cancelled before it fired                           */
/* -------------------------------------------------------------------------- */

export type BroadcastChannel = "sms" | "whatsapp";
export type BroadcastStatus = "pending" | "ready" | "running" | "complete" | "cancelled";

export interface IBroadcastJobError {
  clientId: mongoose.Types.ObjectId;
  error: string;
}

export interface IBroadcastJobRecipientSnapshot {
  clientId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  /** WA-only: has the designer marked this recipient as sent in the queue? */
  sent?: boolean;
}

export interface IBroadcastJob extends Document {
  designerId: mongoose.Types.ObjectId;
  segment: string;
  message: string;
  language?: "english" | "pidgin";
  channel: BroadcastChannel;
  /** null = immediate; Date in the future = scheduled */
  scheduledFor?: Date | null;
  status: BroadcastStatus;
  /** Snapshot of recipients at job creation — used by cron for SMS, by the
   *  /broadcast?resume=ID flow for WhatsApp. */
  recipients: IBroadcastJobRecipientSnapshot[];
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  /** Per-recipient send failures.  Renamed from `errors` to avoid clashing
   *  with Mongoose's Document.errors (validation errors). */
  errorList: IBroadcastJobError[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastJobSchema = new Schema<IBroadcastJob>(
  {
    designerId:    { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    segment:       { type: String, required: true },
    message:       { type: String, required: true, maxlength: 1000 },
    language:      { type: String, enum: ["english", "pidgin"] },
    channel:       { type: String, enum: ["sms", "whatsapp"], required: true },
    scheduledFor:  { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["pending", "ready", "running", "complete", "cancelled"],
      default: "pending",
      index: true,
    },
    recipients: [
      {
        clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
        name:     { type: String, required: true },
        phone:    { type: String, required: true },
        sent:     { type: Boolean, default: false },
      },
    ],
    recipientCount: { type: Number, default: 0, min: 0 },
    sentCount:      { type: Number, default: 0, min: 0 },
    failedCount:    { type: Number, default: 0, min: 0 },
    errorList: [
      {
        clientId: { type: Schema.Types.ObjectId, ref: "Client" },
        error:    { type: String },
      },
    ],
    startedAt:   { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Designer feed: newest first
BroadcastJobSchema.index({ designerId: 1, createdAt: -1 });
// Cron query: due-and-pending across all designers
BroadcastJobSchema.index({ status: 1, scheduledFor: 1 });

export const BroadcastJob =
  (mongoose.models.BroadcastJob as mongoose.Model<IBroadcastJob>) ||
  mongoose.model<IBroadcastJob>("BroadcastJob", BroadcastJobSchema);
