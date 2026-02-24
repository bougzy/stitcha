/* -------------------------------------------------------------------------- */
/*  Order Status State Machine                                                 */
/*  Defines valid transitions and prevents invalid status jumps               */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUSES = [
  "pending",
  "cutting",
  "sewing",
  "fitting",
  "finishing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Map of valid transitions: key = current status, value = list of allowed next statuses.
 * - Linear flow: pending → cutting → sewing → fitting → finishing → ready → delivered
 * - Rework: fitting can go back to sewing
 * - Cancel: any status (except delivered) can transition to cancelled
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ["cutting", "cancelled"],
  cutting:    ["sewing", "cancelled"],
  sewing:     ["fitting", "cancelled"],
  fitting:    ["finishing", "sewing", "cancelled"],  // sewing = rework loop
  finishing:  ["ready", "cancelled"],
  ready:      ["delivered", "cancelled"],
  delivered:  [],                                     // terminal state
  cancelled:  [],                                     // terminal state
};

/** Check if transitioning from `from` to `to` is allowed */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as OrderStatus];
  if (!allowed) return false;
  return allowed.includes(to as OrderStatus);
}

/** Get the list of valid next statuses for the current status */
export function getNextStatuses(current: string): OrderStatus[] {
  return VALID_TRANSITIONS[current as OrderStatus] ?? [];
}

/** Human-readable status labels */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    "Pending",
  cutting:    "Cutting",
  sewing:     "Sewing",
  fitting:    "Fitting",
  finishing:  "Finishing",
  ready:      "Ready",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};

/** Status colors for UI badges */
export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:    { bg: "bg-gray-100",    text: "text-gray-600" },
  cutting:    { bg: "bg-blue-100",    text: "text-blue-600" },
  sewing:     { bg: "bg-indigo-100",  text: "text-indigo-600" },
  fitting:    { bg: "bg-purple-100",  text: "text-purple-600" },
  finishing:  { bg: "bg-amber-100",   text: "text-amber-600" },
  ready:      { bg: "bg-emerald-100", text: "text-emerald-600" },
  delivered:  { bg: "bg-green-100",   text: "text-green-700" },
  cancelled:  { bg: "bg-red-100",     text: "text-red-600" },
};
