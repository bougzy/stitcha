import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { ActivityLog, logActivity } from "@/lib/models/activity-log";
import { loadDesignerForAction, getEffectivePlan } from "@/lib/access-control";
import { checkSubscriptionLimit, AI_ASSIST_ACTIONS } from "@/lib/subscription";
import { generateCaption } from "@/lib/ai-caption";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/caption                                                      */
/*  Generates a Discover-feed caption for a finished order. Shares its        */
/*  monthly quota with price-suggestion and quotation (one pooled "AI         */
/*  assist" allowance per plan).                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { orderId } = body as { orderId?: string };

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
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

    const check = checkSubscriptionLimit(plan, "use_ai_caption", monthlyCount, lifetimeCount);
    if (!check.allowed) {
      return NextResponse.json({ success: false, error: check.message }, { status: 403 });
    }

    const [order, designer] = await Promise.all([
      Order.findOne({ _id: orderId, designerId, isDeleted: { $ne: true } })
        .select("garmentType fabric description")
        .lean(),
      Designer.findById(designerId).select("businessName specialties").lean(),
    ]);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const o = order as { garmentType?: string; fabric?: string; description?: string };
    const d = designer as { businessName?: string; specialties?: string[] } | null;

    const result = await generateCaption({
      garmentType: o.garmentType || "garment",
      fabric: o.fabric,
      description: o.description,
      businessName: d?.businessName || "this designer",
      specialties: d?.specialties,
    });

    logActivity({
      designerId,
      action: "ai_caption",
      entity: "order",
      entityId: orderId,
      details: `AI caption generated for order`,
      metadata: { orderId, source: result.source },
    });

    return NextResponse.json({ success: true, data: result, remaining: check.message });
  } catch (error) {
    console.error("POST /api/ai/caption error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
