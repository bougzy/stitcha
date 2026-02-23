import mongoose, { Schema, type Document } from "mongoose";

export interface IStatusHistoryEntry {
  status: string;
  changedAt: Date;
  note?: string;
}

export interface IOrder extends Document {
  designerId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: string;
  statusHistory: IStatusHistoryEntry[];
  garmentType: string;
  fabric?: string;
  price: number;
  currency: string;
  depositPaid: number;
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cutting", "sewing", "fitting", "finishing", "ready", "delivered", "cancelled"],
      default: "pending",
    },
    garmentType: { type: String, required: true },
    fabric: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    depositPaid: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    notes: { type: String },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ designerId: 1, status: 1 });
OrderSchema.index({ clientId: 1 });
OrderSchema.index({ dueDate: 1 });

export const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
