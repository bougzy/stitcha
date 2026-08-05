import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { ActivityLog, logActivity } from "@/lib/models/activity-log";
import { loadDesignerForAction, getEffectivePlan } from "@/lib/access-control";
import { checkSubscriptionLimit, AI_ASSIST_ACTIONS } from "@/lib/subscription";
import { generateBroadcastMessage } from "@/lib/ai-broadcast";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/broadcast-message                                            */
/*  Generates a segment-aware broadcast message. Shares its monthly quota     */
/*  with price-suggestion, quotation, and caption (one pooled "AI assist"     */
/*  allowance per plan).                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { segment, segmentDescription, goal, lang } = body as {
      segment?: string;
      segmentDescription?: string;
      goal?: string;
      lang?: "english" | "pidgin";
    };

    if (!segment || !segmentDescription) {
      return NextResponse.json(
        { success: false, error: "segment and segmentDescription are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const gate = await loadDesignerForAction(designerId);
    if (!gate.ok) {
      return NextResponse.json(
        { success: false, error: gate.message, suspended: gate.reason === "suspended" },
        { status: gate.status }
      );
    }

    const plan = getEffectivePlan(gate.designer);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const monthlyCount = await ActivityLog.countDocuments({
      designerId,
      action: { $in: AI_ASSIST_ACTIONS },
      createdAt: { $gte: startOfMonth },
    });

    let lifetimeCount = 0;
    if (plan === "free") {
      lifetimeCount = await ActivityLog.countDocuments({
        designerId,
        action: { $in: AI_ASSIST_ACTIONS },
      });
    }

    const check = checkSubscriptionLimit(plan, "use_ai_broadcast", monthlyCount, lifetimeCount);
    if (!check.allowed) {
      return NextResponse.json({ success: false, error: check.message }, { status: 403 });
    }

    const designerDoc = (await Designer.findById(designerId).select("businessName").lean()) as {
      businessName?: string;
    } | null;

    const result = await generateBroadcastMessage({
      segment,
      segmentDescription,
      goal,
      lang: lang === "pidgin" ? "pidgin" : "english",
      businessName: designerDoc?.businessName || "Your designer",
    });

    logActivity({
      designerId,
      action: "ai_broadcast",
      entity: "client",
      details: `AI broadcast message generated for segment "${segment}"`,
      metadata: { segment, source: result.source },
    });

    return NextResponse.json({ success: true, data: result, remaining: check.message });
  } catch (error) {
    console.error("POST /api/ai/broadcast-message error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
