import mongoose, { Schema, type Document } from "mongoose";

const MeasurementsSubSchema = new Schema(
  {
    bust: Number,
    waist: Number,
    hips: Number,
    shoulder: Number,
    armLength: Number,
    inseam: Number,
    neck: Number,
    chest: Number,
    backLength: Number,
    frontLength: Number,
    sleeveLength: Number,
    wrist: Number,
    thigh: Number,
    knee: Number,
    calf: Number,
    ankle: Number,
    height: Number,
    weight: Number,
    source: { type: String, enum: ["manual", "ai_scan"], default: "manual" },
    confidence: Number,
    measuredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface IClient extends Document {
  designerId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone: string;
  gender: "male" | "female";
  notes?: string;
  measurements?: typeof MeasurementsSubSchema;
  measurementHistory: (typeof MeasurementsSubSchema)[];
  lastMeasuredAt?: Date;
  scanLink?: string;
  shareCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    designerId: { type: Schema.Types.ObjectId, ref: "Designer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    notes: { type: String, maxlength: 1000 },
    measurements: MeasurementsSubSchema,
    measurementHistory: [MeasurementsSubSchema],
    lastMeasuredAt: { type: Date },
    scanLink: { type: String, unique: true, sparse: true },
    shareCode: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ designerId: 1, name: "text" });
ClientSchema.index({ designerId: 1, createdAt: -1 });
ClientSchema.index({ scanLink: 1 });
ClientSchema.index({ shareCode: 1 });

export const Client =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
