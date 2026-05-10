import mongoose, { Schema, type Document } from "mongoose";

/* -------------------------------------------------------------------------- */
/*  ManualPayment                                                                */
/*                                                                              */
/*  Designer-submitted bank-transfer payment proof. Admin verifies in the     */
/*  /admin/payments dashboard; on verify the matching feature is activated   */
/*  via the shared activatePurchase() helper.                                  */
/*                                                                              */
/*  Every paid feature in the app routes through this when the designer       */
/*  picks "Pay by bank transfer":                                              */
/*    purpose = subscription | boost_post | sms_pack | studio_addon          */
/* -------------------------------------------------------------------------- */

export type ManualPaymentPurpose =
  | "subscription"
  | "boost_post"
  | "sms_pack"
  | "studio_addon";

export type ManualPaymentStatus = "pending" | "verified" | "rejected";

export interface IManualPayment extends Document {
  designerId: mongoose.Types.ObjectId;
  /** What this payment is for. */
  purpose: ManualPaymentPurpose;
  /** Amount the designer SAYS they sent (NGN). */
  amount: number;
  /** Short reference code generated at submission time — designer is told to
   *  put this in the bank-transfer narration so the admin can match. */
  reference: string;
  /** Per-purpose payload the activation helper needs. */
  payload: {
    planId?: "free" | "plus" | "pro";
    orderId?: string;
    packId?: string;
    durationDays?: number;
    smsCount?: number;
  };
  /** Optional bank-receipt screenshot (base64 data-URL or hosted URL). */
  proofImage?: string;
  /** Designer's account name on the sending side. */
  senderName?: string;
  /** Sending bank (optional, free text). */
  senderBank?: string;
  /** Free-text note from the designer (e.g. "sent at 3pm Tue"). */
  designerNote?: string;
  status: ManualPaymentStatus;
  /** Set on reject. */
  adminNote?: string;
  verifiedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ManualPaymentSchema = new Schema<IManualPayment>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    purpose: {
      type: String,
      enum: ["subscription", "boost_post", "sms_pack", "studio_addon"],
      required: true,
    },
    amount:    { type: Number, required: true, min: 0 },
    reference: { type: String, required: true, index: true, unique: true },
    payload: {
      planId:       { type: String, enum: ["free", "plus", "pro"] },
      orderId:      { type: String },
      packId:       { type: String },
      durationDays: { type: Number },
      smsCount:     { type: Number },
    },
    proofImage:   { type: String },
    senderName:   { type: String, trim: true, maxlength: 120 },
    senderBank:   { type: String, trim: true, maxlength: 80 },
    designerNote: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote:  { type: String, maxlength: 500 },
    verifiedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true },
);

// Admin queue: pending first, newest first
ManualPaymentSchema.index({ status: 1, createdAt: -1 });
// Designer's own list: newest first
ManualPaymentSchema.index({ designerId: 1, createdAt: -1 });

export const ManualPayment =
  (mongoose.models.ManualPayment as mongoose.Model<IManualPayment>) ||
  mongoose.model<IManualPayment>("ManualPayment", ManualPaymentSchema);
