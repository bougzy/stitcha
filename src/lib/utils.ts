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

export function measurementToInches(cm: number): string {
  return (cm / 2.54).toFixed(1);
}

export function inchesToCm(inches: number): string {
  return (inches * 2.54).toFixed(1);
}

/**
 * Convert cm to nearest 0.5" for display (Nigerian tailoring convention).
 * e.g. 96.5cm → 38.0", 99cm → 39.0"
 */
export function cmToDisplayInches(cm: number): number {
  const raw = cm / 2.54;
  return Math.round(raw * 2) / 2; // round to nearest 0.5
}

/**
 * Format a measurement for display.
 * - unit "in": "38" (96.5 cm)"
 * - unit "cm": "96.5 cm"
 */
export function formatMeasurement(
  cm: number,
  unit: "in" | "cm",
  showSecondary = true
): string {
  if (unit === "in") {
    const inches = cmToDisplayInches(cm);
    const secondary = showSecondary ? ` (${cm.toFixed(1)} cm)` : "";
    return `${inches}"${secondary}`;
  }
  return `${cm.toFixed(1)} cm`;
}

/**
 * Parse a user-entered measurement string into cm.
 * Accepts bare numbers (treated as the current unit) or "38in" / "96.5cm".
 */
export function parseMeasurementInput(
  value: string,
  unit: "in" | "cm"
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // explicit suffix
  if (/in$/i.test(trimmed)) {
    const n = parseFloat(trimmed);
    return isNaN(n) ? null : parseFloat((n * 2.54).toFixed(2));
  }
  if (/cm$/i.test(trimmed)) {
    const n = parseFloat(trimmed);
    return isNaN(n) ? null : n;
  }
  // bare number — interpret in the current unit
  const n = parseFloat(trimmed);
  if (isNaN(n)) return null;
  return unit === "in" ? parseFloat((n * 2.54).toFixed(2)) : n;
}
