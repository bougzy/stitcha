import mongoose, { Schema, type Document } from "mongoose";

export interface ICalendarEvent extends Document {
  designerId: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  type: "owambe" | "deadline" | "custom";
  orderId?: mongoose.Types.ObjectId;
  notes?: string;
  color?: string;
  createdAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    title: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: ["owambe", "deadline", "custom"], required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    notes: { type: String },
    color: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CalendarEventSchema.index({ designerId: 1, date: 1 });
CalendarEventSchema.index({ orderId: 1 }, { sparse: true });

export const CalendarEvent =
  mongoose.models.CalendarEvent || mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
