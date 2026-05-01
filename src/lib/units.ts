/* -------------------------------------------------------------------------- */
/*  Units — Stitcha is inches-first.                                           */
/*  All stored measurements are inches. cm helpers exist only for legacy data  */
/*  and the optional cm display toggle.                                        */
/* -------------------------------------------------------------------------- */

export const CM_PER_INCH = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/** Round to nearest 1/8 inch (the practical tailoring resolution). */
export function roundEighth(inches: number): number {
  return Math.round(inches * 8) / 8;
}

/** Round to nearest 1/4 inch — common for less critical measurements. */
export function roundQuarter(inches: number): number {
  return Math.round(inches * 4) / 4;
}

/** Round to nearest 1/2 inch — used for size-chart bands. */
export function roundHalf(inches: number): number {
  return Math.round(inches * 2) / 2;
}

/**
 * Pretty-print inches as a decimal with a trailing inch mark.
 *  formatInches(38.5)        → "38.5\""
 *  formatInches(38, "frac")  → "38\""
 *  formatInches(38.625, "frac") → "38 5/8\""
 */
export function formatInches(
  value: number,
  style: "decimal" | "fraction" = "decimal",
): string {
  if (!isFinite(value)) return "—";
  if (style === "fraction") return `${toFractionalInches(value)}"`;
  return `${roundEighth(value).toFixed(1).replace(/\.0$/, "")}"`;
}

/** "38 5/8" style fractional inches at 1/8 resolution. */
export function toFractionalInches(value: number): string {
  const eighths = Math.round(value * 8);
  const whole = Math.trunc(eighths / 8);
  const rem = Math.abs(eighths) % 8;
  if (rem === 0) return `${whole}`;
  // simplify
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(rem, 8);
  return `${whole} ${rem / g}/${8 / g}`;
}

/**
 * Parse a free-form string into inches. Accepts:
 *  "38", "38.5", "38\"", "38 5/8", "38 5/8\"", "97cm", "38in"
 */
export function parseInchesInput(value: string): number | null {
  const s = value.trim().toLowerCase().replace(/[″"]/g, "").trim();
  if (!s) return null;

  // explicit cm
  if (/cm$/.test(s)) {
    const n = parseFloat(s);
    return isFinite(n) ? cmToIn(n) : null;
  }

  // strip explicit inch suffix
  const stripped = s.replace(/\s*(in|inch|inches)$/, "").trim();

  // mixed fraction "38 5/8"
  const mixed = stripped.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // pure fraction "5/8"
  const frac = stripped.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = parseFloat(frac[1]);
    const den = parseFloat(frac[2]);
    if (den === 0) return null;
    return num / den;
  }

  const n = parseFloat(stripped);
  return isFinite(n) ? n : null;
}
