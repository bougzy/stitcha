import mongoose, { Schema, type Document } from "mongoose";

/* -------------------------------------------------------------------------- */
/*  PaymentLink                                                                */
/*                                                                              */
/*  A shareable "pay me ₦X for this order" request. Deliberately NOT a card    */
/*  checkout that routes funds through Stitcha's own account — the client      */
/*  pays the designer's own bank account directly (shown on the public page).  */
/*  Stitcha never holds or moves the money; this is just a nicer, trackable    */
/*  version of "here's my account number" sent over WhatsApp.                  */
/*                                                                              */
/*  Supports installments naturally: a designer can create several links      */
/*  against the same order (e.g. "Deposit", "Installment 2", "Balance"),      */
/*  each tracked independently and rolled into Order.payments[] on confirm.   */
/* -------------------------------------------------------------------------- */

export type PaymentLinkStatus = "pending" | "client_marked_paid" | "confirmed" | "cancelled";

export interface IPaymentLink extends Document {
  designerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  code: string;
  label: string;
  amount: number;
  currency: string;
  status: PaymentLinkStatus;
  clientMarkedPaidAt?: Date;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "NGN" },
    status: {
      type: String,
      enum: ["pending", "client_marked_paid", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    clientMarkedPaidAt: { type: Date },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

PaymentLinkSchema.index({ designerId: 1, orderId: 1, createdAt: -1 });

export const PaymentLink =
  mongoose.models.PaymentLink || mongoose.model<IPaymentLink>("PaymentLink", PaymentLinkSchema);
