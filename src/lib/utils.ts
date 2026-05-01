import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

export function generateScanLink(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/* -------------------------------------------------------------------------- */
/*  Measurement formatting — Stitcha is inches-first.                          */
/*  Stored values are always in INCHES.                                        */
/* -------------------------------------------------------------------------- */

import { CM_PER_INCH, roundEighth } from "./units";

/** Round inches to nearest 0.5" — used for size-chart bands. */
export function toDisplayInches(inches: number): number {
  return Math.round(inches * 2) / 2;
}

/**
 * Format a stored measurement (inches) for display.
 * - unit "in" (default): `38.5"`
 * - unit "cm": `97.8 cm` — kept as a fallback only.
 */
export function formatMeasurement(
  inches: number,
  unit: "in" | "cm" = "in",
  showSecondary = false,
): string {
  if (!isFinite(inches)) return "—";
  if (unit === "cm") return `${(inches * CM_PER_INCH).toFixed(1)} cm`;
  const primary = `${roundEighth(inches).toFixed(1).replace(/\.0$/, "")}"`;
  if (!showSecondary) return primary;
  return `${primary} (${(inches * CM_PER_INCH).toFixed(1)} cm)`;
}

/**
 * Parse a user-entered measurement into INCHES.
 * Accepts: "38", "38.5", `38"`, "38 5/8", "97cm", "38in".
 * The optional `unit` controls how a bare number is interpreted (default: in).
 */
export function parseMeasurementInput(
  value: string,
  unit: "in" | "cm" = "in",
): number | null {
  const s = value.trim().toLowerCase().replace(/[″"]/g, "").trim();
  if (!s) return null;

  // explicit cm
  if (/cm$/.test(s)) {
    const n = parseFloat(s);
    return isFinite(n) ? n / CM_PER_INCH : null;
  }
  // explicit inches suffix
  const stripped = s.replace(/\s*(in|inch|inches)$/, "").trim();

  // mixed "38 5/8"
  const mixed = stripped.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (!den) return null;
    return whole + num / den;
  }
  // pure fraction "5/8"
  const frac = stripped.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = parseFloat(frac[1]);
    const den = parseFloat(frac[2]);
    if (!den) return null;
    return num / den;
  }
  const n = parseFloat(stripped);
  if (!isFinite(n)) return null;
  return unit === "cm" ? n / CM_PER_INCH : n;
}

/** Legacy helpers — only used by old data paths still in cm. */
export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}
export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/**
 * @deprecated Storage is now inches; use `toDisplayInches` instead.
 *  The name is preserved for the components that still reference it; semantics
 *  are now "round inches to nearest 0.5".
 */
export const cmToDisplayInches = toDisplayInches;
