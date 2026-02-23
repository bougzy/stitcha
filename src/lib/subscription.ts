import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import type { DesignerRole } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Subscription enforcement helpers                                           */
/* -------------------------------------------------------------------------- */

type PlanId = "free" | "pro" | "business";
type Action = "create_client" | "create_scan" | "use_ai_scan" | "export_pdf" | "email_notification" | "sms_notification" | "public_profile";

function getPlan(subscription: string) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === subscription) || SUBSCRIPTION_PLANS[0];
}

/**
 * Check whether a designer can perform a specific action based on their plan.
 * Uses LIFETIME counts for clients — deleting clients does NOT free up slots.
 * Returns { allowed, message } — message explains the restriction if any.
 */
export function checkSubscriptionLimit(
  subscription: string,
  action: Action,
  currentCount?: number,
  lifetimeCount?: number
): { allowed: boolean; message: string } {
  const plan = getPlan(subscription);
  const planId = plan.id as PlanId;

  switch (action) {
    case "create_client": {
      if (plan.clientLimit === -1) return { allowed: true, message: "" };
      // Use lifetime count (non-decreasing) to prevent gaming via delete-and-recreate
      const effectiveCount = lifetimeCount ?? currentCount;
      if (effectiveCount !== undefined && effectiveCount >= plan.clientLimit) {
        return {
          allowed: false,
          message: `You've created ${effectiveCount} clients (lifetime limit: ${plan.clientLimit} on ${plan.name}). Your business has outgrown the free tier — upgrade to Professional for unlimited clients.`,
        };
      }
      return { allowed: true, message: "" };
    }

    case "create_scan":
    case "use_ai_scan": {
      if (plan.scanLimit === -1) return { allowed: true, message: "" };
      if (currentCount !== undefined && currentCount >= plan.scanLimit) {
        const upgradeTarget = planId === "free" ? "Pro" : "Business";
        return {
          allowed: false,
          message: `You've used all ${plan.scanLimit} scans for this month on the ${plan.name} plan. Upgrade to ${upgradeTarget} for more scans.`,
        };
      }
      return { allowed: true, message: "" };
    }

    case "export_pdf":
      return planId === "free"
        ? { allowed: false, message: "PDF exports are available on the Pro plan and above." }
        : { allowed: true, message: "" };

    case "email_notification":
      return planId === "free"
        ? { allowed: false, message: "Email notifications are available on the Pro plan and above." }
        : { allowed: true, message: "" };

    case "sms_notification":
      return planId !== "business"
        ? { allowed: false, message: "SMS notifications are available on the Business plan." }
        : { allowed: true, message: "" };

    case "public_profile":
      return planId !== "business"
        ? { allowed: false, message: "Public profile pages are available on the Business plan." }
        : { allowed: true, message: "" };

    default:
      return { allowed: true, message: "" };
  }
}

/* -------------------------------------------------------------------------- */
/*  Role-based permission checks (Apprentice Mode)                             */
/* -------------------------------------------------------------------------- */

const ROLE_PERMISSIONS: Record<DesignerRole, Set<string>> = {
  admin: new Set([
    "view_clients", "create_client", "edit_client", "delete_client",
    "view_orders", "create_order", "edit_order", "delete_order",
    "record_payment", "delete_payment", "view_finances",
    "manage_team", "manage_settings", "export_data",
    "use_ai_scan", "view_measurements",
    "view_admin", "manage_designers", "view_analytics",
  ]),
  owner: new Set([
    "view_clients", "create_client", "edit_client", "delete_client",
    "view_orders", "create_order", "edit_order", "delete_order",
    "record_payment", "delete_payment", "view_finances",
    "manage_team", "manage_settings", "export_data",
    "use_ai_scan", "view_measurements",
  ]),
  manager: new Set([
    "view_clients", "create_client", "edit_client",
    "view_orders", "create_order", "edit_order",
    "record_payment", "view_finances",
    "use_ai_scan", "view_measurements", "export_data",
  ]),
  apprentice: new Set([
    "view_clients", "view_orders",
    "view_measurements",
  ]),
};

export function checkRolePermission(
  role: DesignerRole,
  permission: string
): { allowed: boolean; message: string } {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.apprentice;
  if (perms.has(permission)) {
    return { allowed: true, message: "" };
  }
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  return {
    allowed: false,
    message: `${roleName} accounts cannot ${permission.replace(/_/g, " ")}. Contact the account owner to upgrade your access.`,
  };
}
