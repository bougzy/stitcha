import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  businessAddress: z.string().min(5, "Please enter your business address"),
  city: z.string().min(2, "Please select your city"),
  state: z.string().min(2, "Please select your state"),
  specialties: z.array(z.string()).min(1, "Select at least one specialty"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
});

export const clientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  notes: z.string().max(1000).optional(),
});

/** Optional number field: accepts valid numbers or NaN (from empty inputs) → undefined */
const optNum = (max: number) =>
  z.number().min(0).max(max).optional().or(z.nan().transform(() => undefined));

export const measurementSchema = z.object({
  bust: optNum(200),
  waist: optNum(200),
  hips: optNum(200),
  shoulder: optNum(100),
  armLength: optNum(100),
  inseam: optNum(120),
  neck: optNum(60),
  chest: optNum(200),
  backLength: optNum(80),
  frontLength: optNum(80),
  sleeveLength: optNum(100),
  wrist: optNum(30),
  thigh: optNum(100),
  knee: optNum(60),
  calf: optNum(60),
  ankle: optNum(40),
  height: optNum(250),
  weight: optNum(300),
});

export const orderSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  title: z.string().min(2, "Order title is required"),
  description: z.string().optional(),
  garmentType: z.string().min(1, "Garment type is required"),
  fabric: z.string().optional(),
  price: z.number().min(0, "Price must be positive").or(z.nan().transform(() => 0)),
  depositPaid: z.number().min(0).optional().or(z.nan().transform(() => 0)),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type MeasurementInput = z.infer<typeof measurementSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
