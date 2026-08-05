import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { ActivityLog, logActivity } from "@/lib/models/activity-log";
import { loadDesignerForAction, getEffectivePlan } from "@/lib/access-control";
import { checkSubscriptionLimit, AI_ASSIST_ACTIONS } from "@/lib/subscription";
import { generateQuotation } from "@/lib/ai-quotation";
import type { MessageLanguage } from "@/lib/whatsapp";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/quotation                                                    */
/*  Generates a warm, client-ready WhatsApp quotation message.                */
/*  Shares its monthly quota with /api/ai/price-suggestion (one "AI assist"  */
/*  pool per plan) — both actions are counted together here.                  */
/* -------------------------------------------------------------------------- */


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const {
      clientName,
      garmentType,
      fabric,
      description,
      price,
      depositPercent,
      dueDate,
      lang,
    } = body as {
      clientName?: string;
      garmentType?: string;
      fabric?: string;
      description?: string;
      price?: number;
      depositPercent?: number;
      dueDate?: string;
      lang?: MessageLanguage;
    };

    if (!clientName || !garmentType || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { success: false, error: "clientName, garmentType, and a positive price are required" },
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

    const check = checkSubscriptionLimit(plan, "use_ai_quotation", monthlyCount, lifetimeCount);
    if (!check.allowed) {
      return NextResponse.json({ success: false, error: check.message }, { status: 403 });
    }

    const designerDoc = (await Designer.findById(designerId)
      .select("businessName")
      .lean()) as { businessName?: string } | null;

    const result = await generateQuotation({
      clientName,
      garmentType,
      fabric,
      description,
      price,
      currency: "NGN",
      depositPercent,
      dueDate,
      businessName: designerDoc?.businessName || "Your designer",
      lang: lang === "pidgin" ? "pidgin" : "english",
    });

    logActivity({
      designerId,
      action: "ai_quotation",
      entity: "client",
      details: `AI quotation generated for ${garmentType} — ${clientName}`,
      metadata: { garmentType, price, source: result.source },
    });

    return NextResponse.json({
      success: true,
      data: result,
      remaining: check.message,
    });
  } catch (error) {
    console.error("POST /api/ai/quotation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
