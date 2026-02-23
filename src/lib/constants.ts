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
  { key: "bust", label: "Bust", unit: "cm" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "hips", label: "Hips", unit: "cm" },
  { key: "shoulder", label: "Shoulder Width", unit: "cm" },
  { key: "armLength", label: "Arm Length", unit: "cm" },
  { key: "inseam", label: "Inseam", unit: "cm" },
  { key: "neck", label: "Neck", unit: "cm" },
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "backLength", label: "Back Length", unit: "cm" },
  { key: "frontLength", label: "Front Length", unit: "cm" },
  { key: "sleeveLength", label: "Sleeve Length", unit: "cm" },
  { key: "wrist", label: "Wrist", unit: "cm" },
  { key: "thigh", label: "Thigh", unit: "cm" },
  { key: "knee", label: "Knee", unit: "cm" },
  { key: "calf", label: "Calf", unit: "cm" },
  { key: "ankle", label: "Ankle", unit: "cm" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Garment → measurement presets                                              */
/*  Maps each garment type to the measurements a designer actually needs       */
/* -------------------------------------------------------------------------- */

export const GARMENT_PRESETS: Record<string, { label: string; icon: string; fields: string[] }> = {
  top: {
    label: "Top / Blouse",
    icon: "👕",
    fields: ["bust", "chest", "shoulder", "neck", "armLength", "sleeveLength", "backLength", "frontLength", "wrist"],
  },
  dress: {
    label: "Dress / Gown",
    icon: "👗",
    fields: ["bust", "chest", "waist", "hips", "shoulder", "neck", "armLength", "sleeveLength", "backLength", "frontLength", "wrist"],
  },
  trousers: {
    label: "Trousers / Pants",
    icon: "👖",
    fields: ["waist", "hips", "inseam", "thigh", "knee", "calf", "ankle"],
  },
  skirt: {
    label: "Skirt",
    icon: "🩱",
    fields: ["waist", "hips", "knee"],
  },
  agbada: {
    label: "Agbada / Kaftan",
    icon: "🧥",
    fields: ["bust", "chest", "shoulder", "neck", "armLength", "sleeveLength", "backLength", "frontLength"],
  },
  suit: {
    label: "Suit / Blazer",
    icon: "🤵",
    fields: ["bust", "chest", "shoulder", "neck", "armLength", "sleeveLength", "backLength", "frontLength", "waist", "wrist"],
  },
  jumpsuit: {
    label: "Jumpsuit",
    icon: "🥋",
    fields: ["bust", "chest", "waist", "hips", "shoulder", "armLength", "sleeveLength", "backLength", "frontLength", "inseam", "thigh", "ankle"],
  },
  all: {
    label: "Full Body (All)",
    icon: "📐",
    fields: ["bust", "waist", "hips", "shoulder", "armLength", "inseam", "neck", "chest", "backLength", "frontLength", "sleeveLength", "wrist", "thigh", "knee", "calf", "ankle"],
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

export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Starter",
    price: 0,
    currency: "NGN",
    features: [
      "Up to 10 clients",
      "Manual measurements",
      "AI body scanning (3/month)",
      "Basic order tracking",
    ],
    clientLimit: 10,
    scanLimit: 3,
  },
  {
    id: "pro",
    name: "Professional",
    price: 5000,
    currency: "NGN",
    features: [
      "Unlimited clients",
      "AI body scanning",
      "Order management",
      "PDF exports",
      "Email notifications",
    ],
    clientLimit: -1,
    scanLimit: 50,
  },
  {
    id: "business",
    name: "Business",
    price: 15000,
    currency: "NGN",
    features: [
      "Everything in Pro",
      "SMS notifications",
      "Public profile page",
      "Priority support",
      "Team collaboration",
    ],
    clientLimit: -1,
    scanLimit: -1,
  },
] as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;
