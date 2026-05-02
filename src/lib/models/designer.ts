// import mongoose, { Schema, type Document } from "mongoose";

// export interface ILifetimeCounts {
//   totalClientsCreated: number;
//   totalScansUsed: number;
//   totalOrdersCreated: number;
// }

// export type DesignerRole = "owner" | "manager" | "apprentice" | "admin";

// export interface IDesigner extends Document {
//   name: string;
//   email: string;
//   phone: string;
//   password: string;
//   businessName: string;
//   businessAddress?: string;
//   city?: string;
//   state?: string;
//   country: string;
//   bio?: string;
//   avatar?: string;
//   specialties: string[];
//   subscription: "free" | "plus" | "pro";
//   subscriptionExpiry?: Date;
//   paystackCustomerId?: string;
//   role: DesignerRole;
//   teamOwnerId?: string;
//   ownerPin?: string;
//   lifetimeCounts: ILifetimeCounts;
//   isOnboarded: boolean;
//   isVerified: boolean;
//   verificationToken?: string;
//   resetPasswordToken?: string;
//   resetPasswordExpires?: Date;
//   publicProfile: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const DesignerSchema = new Schema<IDesigner>(
//   {
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//     phone: { type: String, required: true, trim: true },
//     password: { type: String, required: true, select: false },
//     businessName: { type: String, required: true, trim: true },
//     businessAddress: { type: String, trim: true },
//     city: { type: String, trim: true },
//     state: { type: String, trim: true },
//     country: { type: String, default: "Nigeria" },
//     bio: { type: String, maxlength: 500 },
//     avatar: { type: String },
//     specialties: [{ type: String }],
//     subscription: { type: String, enum: ["free", "plus", "pro"], default: "free" },
//     subscriptionExpiry: { type: Date },
//     paystackCustomerId: { type: String },
//     role: { type: String, enum: ["owner", "manager", "apprentice", "admin"], default: "owner" },
//     teamOwnerId: { type: Schema.Types.ObjectId, ref: "Designer" },
//     ownerPin: { type: String, select: false },
//     lifetimeCounts: {
//       totalClientsCreated: { type: Number, default: 0 },
//       totalScansUsed: { type: Number, default: 0 },
//       totalOrdersCreated: { type: Number, default: 0 },
//     },
//     isOnboarded: { type: Boolean, default: false },
//     isVerified: { type: Boolean, default: false },
//     verificationToken: { type: String },
//     resetPasswordToken: { type: String },
//     resetPasswordExpires: { type: Date },
//     publicProfile: { type: Boolean, default: false },
//   },
//   {
//     timestamps: true,
//   }
// );

// DesignerSchema.index({ email: 1 });
// DesignerSchema.index({ phone: 1 });
// DesignerSchema.index({ businessName: "text", name: "text" });

// export const Designer =
//   mongoose.models.Designer || mongoose.model<IDesigner>("Designer", DesignerSchema);



import mongoose, { Schema, type Document } from "mongoose";

export interface ILifetimeCounts {
  totalClientsCreated: number;
  totalScansUsed: number;
  totalOrdersCreated: number;
}

export type DesignerRole = "owner" | "manager" | "apprentice" | "admin";

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
  subscription: "free" | "plus" | "pro";
  subscriptionExpiry?: Date;
  paystackCustomerId?: string;
  role: DesignerRole;
  teamOwnerId?: string;
  ownerPin?: string;
  lifetimeCounts: ILifetimeCounts;
  isOnboarded: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  publicProfile: boolean;
  /** SMS credit balance (consumed per SMS sent via Termii). */
  smsBalance?: number;
  smsLifetimePurchased?: number;
  /** Studio addon — branded PDFs, brand color, vanity URL. */
  studioAddon?: {
    expiresAt?: Date;
    brandColor?: string;
    logoUrl?: string;
    customSlug?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DesignerSchema = new Schema<IDesigner>(
  {
    name:            { type: String, required: true, trim: true },
    // FIX: removed duplicate index — "unique: true" on the field already
    // creates an index. The explicit DesignerSchema.index({ email: 1 })
    // below was creating a second identical index causing the Mongoose warning.
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:           { type: String, required: true, trim: true },
    password:        { type: String, required: true, select: false },
    businessName:    { type: String, required: true, trim: true },
    businessAddress: { type: String, trim: true },
    city:            { type: String, trim: true },
    state:           { type: String, trim: true },
    country:         { type: String, default: "Nigeria" },
    bio:             { type: String, maxlength: 500 },
    avatar:          { type: String },
    specialties:     [{ type: String }],
    subscription:    { type: String, enum: ["free", "plus", "pro"], default: "free" },
    subscriptionExpiry:   { type: Date },
    paystackCustomerId:   { type: String },
    role: {
      type: String,
      enum: ["owner", "manager", "apprentice", "admin"],
      default: "owner",
    },
    teamOwnerId: { type: Schema.Types.ObjectId, ref: "Designer" },
    ownerPin:    { type: String, select: false },
    lifetimeCounts: {
      totalClientsCreated: { type: Number, default: 0 },
      totalScansUsed:      { type: Number, default: 0 },
      totalOrdersCreated:  { type: Number, default: 0 },
    },
    isOnboarded:          { type: Boolean, default: false },
    isVerified:           { type: Boolean, default: false },
    verificationToken:    { type: String },
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },
    publicProfile:        { type: Boolean, default: false },
    smsBalance:           { type: Number, default: 0, min: 0 },
    smsLifetimePurchased: { type: Number, default: 0, min: 0 },
    studioAddon: {
      expiresAt:  { type: Date },
      brandColor: { type: String, default: "#C75B39" },
      logoUrl:    { type: String },
      customSlug: { type: String, index: true, sparse: true },
    },
  },
  {
    timestamps: true,
  }
);

// FIX: Removed DesignerSchema.index({ email: 1 }) — email already has
// a unique index from "unique: true" in the field definition above.
// Keeping both caused: "Duplicate schema index on {"email":1}"
// Only keeping phone and text search indexes which are NOT duplicates.
DesignerSchema.index({ phone: 1 });
DesignerSchema.index({ businessName: "text", name: "text" });

export const Designer =
  mongoose.models.Designer ||
  mongoose.model<IDesigner>("Designer", DesignerSchema);