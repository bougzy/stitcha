import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import type { DesignerRole } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Subscription enforcement helpers                                           */
/*                                                                             */
/*  Plan IDs: "free" | "plus" | "pro"                                         */
/*  Free  — unlimited clients & orders + 2 LIFETIME trial AI scans            */
/*  Plus  — 20 AI scans/month                                                 */
/*  Pro   — unlimited AI scans, public profile, team                          */
/* -------------------------------------------------------------------------- */

type PlanId = "free" | "plus" | "pro";
type Action =
  | "create_client"
  | "create_scan"
  | "use_ai_scan"
  | "use_ai_pricing"
  | "export_pdf"
  | "email_notification"
  | "sms_notification"
  | "public_profile";

function getPlan(subscription: string) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === subscription) || SUBSCRIPTION_PLANS[0];
}

/**
 * Check whether a designer can perform a specific action based on their plan.
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
      // All plans have unlimited clients
      return { allowed: true, message: "" };
    }

    case "create_scan":
    case "use_ai_scan": {
      // Free plan: 2 lifetime trial scans, then upgrade or buy credits
      if (planId === "free") {
        const used = lifetimeCount ?? 0;
        const trial = plan.scanLimit; // 2
        if (used < trial) {
          const remaining = trial - used;
          return {
            allowed: true,
            message: `${remaining} free trial scan${remaining === 1 ? "" : "s"} remaining`,
          };
        }
        return {
          allowed: false,
          message: `You've used your ${trial} free trial scans. Upgrade to Plus (₦1,500/month, 20 scans) or buy pay-per-scan credits at ₦150 each. You can still use the guided tape measure for free.`,
        };
      }
      // Unlimited scans on Pro
      if (plan.scanLimit === -1) return { allowed: true, message: "" };
      // Plus: 20/month limit
      if (currentCount !== undefined && currentCount >= plan.scanLimit) {
        return {
          allowed: false,
          message: `You have used all ${plan.scanLimit} AI scans for this month on the ${plan.name} plan. Upgrade to Pro for unlimited scans, or buy pay-per-scan credits for ₦150 each.`,
        };
      }
      return { allowed: true, message: "" };
    }

    case "use_ai_pricing": {
      // Free plan: 5 lifetime trial suggestions, then upgrade
      if (planId === "free") {
        const used = lifetimeCount ?? 0;
        const trial = plan.aiPricingLimit; // 5
        if (used < trial) {
          const remaining = trial - used;
          return {
            allowed: true,
            message: `${remaining} free AI price suggestion${remaining === 1 ? "" : "s"} remaining`,
          };
        }
        return {
          allowed: false,
          message: `You've used your ${trial} free trial AI price suggestions. Upgrade to Plus (₦1,500/month, 50/month) or Pro (unlimited) to keep getting AI pricing help.`,
        };
      }
      // Unlimited on Pro
      if (plan.aiPricingLimit === -1) return { allowed: true, message: "" };
      // Plus: monthly limit
      if (currentCount !== undefined && currentCount >= plan.aiPricingLimit) {
        return {
          allowed: false,
          message: `You have used all ${plan.aiPricingLimit} AI price suggestions for this month on the ${plan.name} plan. Upgrade to Pro for unlimited suggestions.`,
        };
      }
      return { allowed: true, message: "" };
    }

    case "export_pdf":
      // PDF is FREE on all plans
      return { allowed: true, message: "" };

    case "email_notification":
      // Email notifications on Plus and Pro
      return planId === "free"
        ? { allowed: false, message: "Email notifications are available on the Plus plan and above." }
        : { allowed: true, message: "" };

    case "sms_notification":
      // SMS only on Pro
      return planId !== "pro"
        ? { allowed: false, message: "SMS notifications are available on the Pro plan." }
        : { allowed: true, message: "" };

    case "public_profile":
      // Public profile only on Pro
      return planId !== "pro"
        ? { allowed: false, message: "Public profile pages are available on the Pro plan." }
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
  if (perms.has(permission)) return { allowed: true, message: "" };
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  return {
    allowed: false,
    message: `${roleName} accounts cannot ${permission.replace(/_/g, " ")}. Contact the account owner to upgrade your access.`,
  };
}
