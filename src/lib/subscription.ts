import { SUBSCRIPTION_PLANS } from "@/lib/constants";

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
 * Returns { allowed, message } — message explains the restriction if any.
 */
export function checkSubscriptionLimit(
  subscription: string,
  action: Action,
  currentCount?: number
): { allowed: boolean; message: string } {
  const plan = getPlan(subscription);
  const planId = plan.id as PlanId;

  switch (action) {
    case "create_client": {
      if (plan.clientLimit === -1) return { allowed: true, message: "" };
      if (currentCount !== undefined && currentCount >= plan.clientLimit) {
        return {
          allowed: false,
          message: `You've reached the ${plan.clientLimit} client limit on the ${plan.name} plan. Upgrade to Pro for unlimited clients.`,
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
