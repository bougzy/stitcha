import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { ScanSession } from "@/lib/models/scan-session";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  GET /api/scan/quota                                                        */
/*                                                                              */
/*  Returns the current designer's AI-scan budget so the UI can show           */
/*  "X free trial scans remaining" / "X / 20 this month" without hitting the  */
/*  enforcement endpoint and getting a 403.                                    */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const designer = await Designer.findById(userId).select("subscription").lean();
    const subscription = (designer as Record<string, unknown> | null)?.subscription as
      | "free"
      | "plus"
      | "pro"
      | undefined;
    const planId = subscription || "free";
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];

    if (planId === "free") {
      const trialUsed = await ScanSession.countDocuments({
        designerId: userId,
        status: "completed",
      });
      const trialAllowed = plan.scanLimit; // 2
      return NextResponse.json({
        success: true,
        data: {
          plan: planId,
          mode: "trial",
          trialAllowed,
          trialUsed,
          trialRemaining: Math.max(0, trialAllowed - trialUsed),
          canScan: trialUsed < trialAllowed,
        },
      });
    }

    if (planId === "pro" || plan.scanLimit === -1) {
      return NextResponse.json({
        success: true,
        data: {
          plan: planId,
          mode: "unlimited",
          canScan: true,
        },
      });
    }

    // Plus: monthly window
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyUsed = await ScanSession.countDocuments({
      designerId: userId,
      createdAt: { $gte: startOfMonth },
    });
    return NextResponse.json({
      success: true,
      data: {
        plan: planId,
        mode: "monthly",
        monthlyAllowed: plan.scanLimit,
        monthlyUsed,
        monthlyRemaining: Math.max(0, plan.scanLimit - monthlyUsed),
        canScan: monthlyUsed < plan.scanLimit,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load quota" },
      { status: 500 },
    );
  }
}
