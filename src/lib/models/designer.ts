import mongoose, { Schema, type Document } from "mongoose";

export interface ILifetimeCounts {
  totalClientsCreated: number;
  totalScansUsed: number;
  totalOrdersCreated: number;
}

export type DesignerRole = "owner" | "manager" | "apprentice";

export interface IDesigner extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  country: string;
  bio?: string;
  avatar?: string;
  specialties: string[];
  subscription: "free" | "pro" | "business";
  role: DesignerRole;
  teamOwnerId?: string;
  lifetimeCounts: ILifetimeCounts;
  isOnboarded: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  publicProfile: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DesignerSchema = new Schema<IDesigner>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    businessName: { type: String, required: true, trim: true },
    businessAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: "Nigeria" },
    bio: { type: String, maxlength: 500 },
    avatar: { type: String },
    specialties: [{ type: String }],
    subscription: { type: String, enum: ["free", "pro", "business"], default: "free" },
    role: { type: String, enum: ["owner", "manager", "apprentice"], default: "owner" },
    teamOwnerId: { type: Schema.Types.ObjectId, ref: "Designer" },
    lifetimeCounts: {
      totalClientsCreated: { type: Number, default: 0 },
      totalScansUsed: { type: Number, default: 0 },
      totalOrdersCreated: { type: Number, default: 0 },
    },
    isOnboarded: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    publicProfile: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

DesignerSchema.index({ email: 1 });
DesignerSchema.index({ phone: 1 });
DesignerSchema.index({ businessName: "text", name: "text" });

export const Designer =
  mongoose.models.Designer || mongoose.model<IDesigner>("Designer", DesignerSchema);
