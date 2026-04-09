export const APP_NAME = "Stitcha";
export const APP_DESCRIPTION = "AI-powered body measurement platform for fashion designers";

/* -------------------------------------------------------------------------- */
/*  APP_URL — Base URL for all generated links (scan links, share links, etc) */
/*  To switch to a custom domain, either:                                      */
/*  1. Set NEXT_PUBLIC_APP_URL env var in Vercel dashboard, OR                 */
/*  2. Change the fallback below from stitcha.vercel.app to your domain       */
/* -------------------------------------------------------------------------- */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stitcha.vercel.app";

export const MEASUREMENT_TYPES = [
  // Circumference
  { key: "bust",             label: "Bust",                   unit: "cm", group: "circumference" },
  { key: "underBust",        label: "Under Bust",             unit: "cm", group: "circumference", aiEstimated: true },
  { key: "waist",            label: "Waist",                  unit: "cm", group: "circumference" },
  { key: "hips",             label: "Hips",                   unit: "cm", group: "circumference" },
  { key: "chest",            label: "Chest",                  unit: "cm", group: "circumference" },
  { key: "neck",             label: "Neck",                   unit: "cm", group: "circumference" },
  { key: "thigh",            label: "Thigh",                  unit: "cm", group: "circumference" },
  { key: "knee",             label: "Knee",                   unit: "cm", group: "circumference" },
  { key: "calf",             label: "Calf",                   unit: "cm", group: "circumference" },
  { key: "wrist",            label: "Wrist",                  unit: "cm", group: "circumference" },
  { key: "ankle",            label: "Ankle",                  unit: "cm", group: "circumference" },
  { key: "roundArm",         label: "Round Arm",              unit: "cm", group: "circumference", aiEstimated: true },
  // Lengths
  { key: "backLength",       label: "Back Length",            unit: "cm", group: "length" },
  { key: "frontLength",      label: "Front Length",           unit: "cm", group: "length" },
  { key: "blouseLength",     label: "Blouse Length",          unit: "cm", group: "length", aiEstimated: true },
  { key: "fullLength",       label: "Full Length",            unit: "cm", group: "length" },
  { key: "halfLength",       label: "Half Length",            unit: "cm", group: "length", aiEstimated: true },
  { key: "armLength",        label: "Arm Length",             unit: "cm", group: "length" },
  { key: "sleeveLength",     label: "Full Sleeve Length",     unit: "cm", group: "length" },
  { key: "halfSleeve",       label: "Half Sleeve Length",     unit: "cm", group: "length" },
  { key: "inseam",           label: "Inseam",                 unit: "cm", group: "length" },
  { key: "crotchLength",     label: "Crotch Length",          unit: "cm", group: "length", aiEstimated: true },
  // Point-to-point
  { key: "shoulder",         label: "Shoulder Width",         unit: "cm", group: "point-to-point" },
  { key: "shoulderToBust",   label: "Shoulder to Bust Point", unit: "cm", group: "point-to-point", aiEstimated: true },
  { key: "shoulderToHip",    label: "Shoulder to Hip Line",   unit: "cm", group: "point-to-point", aiEstimated: true },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_TYPES)[number]["key"];

/** Grouped for UI display */
export const MEASUREMENT_GROUPS = {
  circumference: {
    label: "Circumference Measurements",
    keys: ["bust","underBust","waist","hips","chest","neck","thigh","knee","calf","wrist","ankle","roundArm"],
  },
  length: {
    label: "Length Measurements",
    keys: ["backLength","frontLength","blouseLength","fullLength","halfLength","armLength","sleeveLength","halfSleeve","inseam","crotchLength"],
  },
  "point-to-point": {
    label: "Point-to-Point",
    keys: ["shoulder","shoulderToBust","shoulderToHip"],
  },
} as const;

/* -------------------------------------------------------------------------- */
/*  Garment → measurement presets                                              */
/*  Maps each garment type to the measurements a designer actually needs       */
/* -------------------------------------------------------------------------- */

export const GARMENT_PRESETS: Record<string, { label: string; icon: string; fields: string[] }> = {
  top: {
    label: "Top / Blouse",
    icon: "👕",
    fields: ["bust","underBust","chest","shoulder","neck","armLength","sleeveLength","halfSleeve","backLength","frontLength","blouseLength","wrist","roundArm"],
  },
  dress: {
    label: "Dress / Gown",
    icon: "👗",
    fields: ["bust","underBust","waist","hips","chest","shoulder","neck","armLength","sleeveLength","backLength","frontLength","blouseLength","fullLength","wrist","shoulderToBust","shoulderToHip"],
  },
  trousers: {
    label: "Trousers / Pants",
    icon: "👖",
    fields: ["waist","hips","inseam","thigh","knee","calf","ankle","crotchLength"],
  },
  skirt: {
    label: "Skirt",
    icon: "🩱",
    fields: ["waist","hips","knee","halfLength"],
  },
  agbada: {
    label: "Agbada / Kaftan",
    icon: "🧥",
    fields: ["bust","chest","shoulder","neck","armLength","sleeveLength","backLength","frontLength","fullLength"],
  },
  suit: {
    label: "Suit / Blazer",
    icon: "🤵",
    fields: ["bust","chest","shoulder","neck","armLength","sleeveLength","backLength","frontLength","waist","wrist","roundArm"],
  },
  jumpsuit: {
    label: "Jumpsuit",
    icon: "🥋",
    fields: ["bust","underBust","chest","waist","hips","shoulder","armLength","sleeveLength","backLength","frontLength","inseam","thigh","ankle","crotchLength"],
  },
  all: {
    label: "Full Body (All)",
    icon: "📐",
    fields: ["bust","underBust","waist","hips","shoulder","armLength","inseam","neck","chest","backLength","frontLength","sleeveLength","halfSleeve","halfLength","blouseLength","fullLength","wrist","thigh","knee","calf","ankle","roundArm","crotchLength","shoulderToBust","shoulderToHip"],
  },
} as const;

/* -------------------------------------------------------------------------- */
/*  Standard size charts (West African / International)                        */
/* -------------------------------------------------------------------------- */

export interface SizeChartEntry {
  label: string;
  bust: [number, number];
  waist: [number, number];
  hips: [number, number];
}

export const SIZE_CHART_FEMALE: SizeChartEntry[] = [
  { label: "XS (6)",  bust: [76, 82],   waist: [58, 64],  hips: [84, 89] },
  { label: "S (8)",   bust: [82, 88],   waist: [64, 70],  hips: [89, 94] },
  { label: "M (10)",  bust: [88, 94],   waist: [70, 76],  hips: [94, 100] },
  { label: "L (12)",  bust: [94, 100],  waist: [76, 82],  hips: [100, 106] },
  { label: "XL (14)", bust: [100, 108], waist: [82, 90],  hips: [106, 113] },
  { label: "XXL (16)", bust: [108, 116], waist: [90, 98],  hips: [113, 120] },
];

export const SIZE_CHART_MALE: SizeChartEntry[] = [
  { label: "XS (36)", bust: [86, 91],   waist: [71, 76],  hips: [86, 91] },
  { label: "S (38)",  bust: [91, 97],   waist: [76, 81],  hips: [91, 97] },
  { label: "M (40)",  bust: [97, 102],  waist: [81, 86],  hips: [97, 102] },
  { label: "L (42)",  bust: [102, 107], waist: [86, 91],  hips: [102, 107] },
  { label: "XL (44)", bust: [107, 117], waist: [91, 102], hips: [107, 117] },
  { label: "XXL (46)", bust: [117, 127], waist: [102, 112], hips: [117, 127] },
];

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "gold" },
  { value: "confirmed", label: "Confirmed", color: "info" },
  { value: "cutting", label: "Cutting", color: "terracotta" },
  { value: "sewing", label: "Sewing", color: "terracotta" },
  { value: "fitting", label: "Fitting", color: "gold" },
  { value: "finishing", label: "Finishing", color: "terracotta" },
  { value: "ready", label: "Ready", color: "success" },
  { value: "delivered", label: "Delivered", color: "success" },
  { value: "cancelled", label: "Cancelled", color: "destructive" },
] as const;

/**
 * PRICING — Nigerian Market First
 * Free is genuinely free, no limits on core features.
 * Plus ₦1,500/month < 2% of a mid-level designer's income.
 * Pay-per-scan ₦150/scan removes all commitment anxiety.
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "NGN",
    features: [
      "Unlimited clients",
      "Unlimited orders",
      "Guided tape-measure entry",
      "WhatsApp measurement sharing",
      "Order tracking & due dates",
      "Automated payment reminders",
      "Basic PDF invoices",
      "Offline mode",
    ],
    clientLimit: -1,
    scanLimit: 0,
    trialDays: 0,
    badge: null,
    description: "Everything a tailor needs to run their business. Free forever.",
  },
  {
    id: "plus",
    name: "Plus",
    price: 1500,
    currency: "NGN",
    features: [
      "Everything in Free",
      "AI body scanning (20 scans/month)",
      "Measurement history & change alerts",
      "Client portal & shareable cards",
      "Financial dashboard",
      "Fabric & profit calculator",
    ],
    clientLimit: -1,
    scanLimit: 20,
    trialDays: 14,
    badge: "Most Popular",
    description: "For growing designers who want AI scanning and deeper insights.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 3500,
    currency: "NGN",
    features: [
      "Everything in Plus",
      "Unlimited AI scans",
      "Public designer profile page",
      "Priority WhatsApp support",
      "Advanced analytics",
      "Team collaboration (2 staff)",
    ],
    clientLimit: -1,
    scanLimit: -1,
    trialDays: 14,
    badge: "Best Value",
    description: "For established studios and high-volume designers.",
  },
] as const;

/** Pay-per-scan — no subscription needed. ₦150 per AI scan. */
export const SCAN_CREDIT_PRICE = 150;

/* -------------------------------------------------------------------------- */
/*  Credit Packs — pay-as-you-go scan credits                                 */
/* -------------------------------------------------------------------------- */

export const CREDIT_PACKS = [
  { id: "pack-5",  scans: 5,  price: 700,  currency: "NGN", label: "Try It",       badge: null },
  { id: "pack-15", scans: 15, price: 2000, currency: "NGN", label: "Small Studio",  badge: "Best Value" as const },
  { id: "pack-40", scans: 40, price: 5000, currency: "NGN", label: "Busy Season",   badge: null },
] as const;

/* -------------------------------------------------------------------------- */
/*  Referral Program                                                           */
/* -------------------------------------------------------------------------- */

export const REFERRAL_CONFIG = {
  referrerReward: 5,
  refereeReward: 5,
  maxReferrals: 50,
  shareMessage: "Hey! I use Stitcha to take AI body measurements for my clients. Sign up with my link and we both get 5 free scans!",
} as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;
