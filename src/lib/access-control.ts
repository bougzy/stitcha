/* -------------------------------------------------------------------------- */
/*  access-control                                                              */
/*                                                                              */
/*  Centralised gates for "can this designer do X right now?"                  */
/*                                                                              */
/*  Why centralise:                                                             */
/*    1. The Designer.subscription field can lie — it stays "plus" even after */
/*       expiry until something explicitly downgrades. Read-time computation  */
/*       avoids a cron downgrader.                                             */
/*    2. Suspended designers must be uniformly blocked across all surfaces.   */
/*    3. Studio addon is feature-flag-style: one helper, all the PDF /        */
/*       branding code paths can call into it.                                  */
/* -------------------------------------------------------------------------- */

import { Designer } from "@/lib/models/designer";

export type Plan = "free" | "plus" | "pro";

interface DesignerLite {
  _id?: unknown;
  subscription?: Plan;
  subscriptionExpiry?: Date | string | null;
  suspended?: boolean;
  suspendedReason?: string;
  studioAddon?: { expiresAt?: Date | string | null } | null;
}

/* -------------------------------------------------------------------------- */
/*  Plan resolution                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The real plan a designer is on RIGHT NOW. If their stored subscription
 * has expired, they fall back to "free". Pro/Plus only count if the expiry
 * is in the future.
 */
export function getEffectivePlan(designer: DesignerLite | null | undefined): Plan {
  const stored = designer?.subscription || "free";
  if (stored === "free") return "free";
  if (!designer?.subscriptionExpiry) {
    // No expiry recorded — assume free unless the field says otherwise. Treat
    // missing-expiry as "lifetime" only for Pro grants (admin manually set).
    return stored;
  }
  const exp = new Date(designer.subscriptionExpiry);
  if (isNaN(exp.getTime())) return "free";
  return exp > new Date() ? stored : "free";
}

export function isStudioActive(designer: DesignerLite | null | undefined): boolean {
  const exp = designer?.studioAddon?.expiresAt;
  if (!exp) return false;
  const d = new Date(exp);
  return !isNaN(d.getTime()) && d > new Date();
}

export function isSuspended(designer: DesignerLite | null | undefined): boolean {
  return !!designer?.suspended;
}

/**
 * Days remaining on the current subscription (or 0 if expired / free).
 * Used for the "renewal due soon" banner.
 */
export function daysUntilSubscriptionExpiry(designer: DesignerLite | null | undefined): number {
  if (!designer?.subscriptionExpiry) return 0;
  const exp = new Date(designer.subscriptionExpiry);
  if (isNaN(exp.getTime())) return 0;
  const ms = exp.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/*  Assertion helpers                                                           */
/*                                                                              */
/*  Each returns a `GateResult` instead of throwing — API routes can decide   */
/*  how to surface the failure (401 / 402 / 403).                              */
/* -------------------------------------------------------------------------- */

export type GateResult =
  | { ok: true; designer: DesignerLite }
  | { ok: false; reason: "not_found" | "suspended"; message: string; status: number };

/** Load designer + run common pre-action checks (exists + not suspended). */
export async function loadDesignerForAction(designerId: string): Promise<GateResult> {
  const designer = (await Designer.findById(designerId)
    .select("subscription subscriptionExpiry suspended suspendedReason studioAddon")
    .lean()) as unknown as DesignerLite | null;

  if (!designer) {
    return {
      ok: false,
      reason: "not_found",
      message: "Designer not found.",
      status: 404,
    };
  }
  if (isSuspended(designer)) {
    return {
      ok: false,
      reason: "suspended",
      message:
        `Your account is currently suspended${
          designer.suspendedReason ? ` — ${designer.suspendedReason}` : ""
        }. Contact support to restore access.`,
      status: 403,
    };
  }
  return { ok: true, designer };
}
