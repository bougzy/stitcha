import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { ActivityLog, logActivity } from "@/lib/models/activity-log";
import { loadDesignerForAction, getEffectivePlan } from "@/lib/access-control";
import { checkSubscriptionLimit, AI_ASSIST_ACTIONS } from "@/lib/subscription";
import { getPriceSuggestion, type HistoricalPriceStats } from "@/lib/ai-pricing";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/price-suggestion                                             */
/*  Returns an AI-generated price recommendation for a garment, grounded in   */
/*  the designer's own order history and estimated fabric yardage.           */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { garmentType, fabric, description, measurements, fabricWidthCm } = body as {
      garmentType?: string;
      fabric?: string;
      description?: string;
      measurements?: Record<string, number | undefined>;
      fabricWidthCm?: number;
    };

    if (!garmentType || typeof garmentType !== "string") {
      return NextResponse.json(
        { success: false, error: "garmentType is required" },
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

    const check = checkSubscriptionLimit(plan, "use_ai_pricing", monthlyCount, lifetimeCount);
    if (!check.allowed) {
      return NextResponse.json({ success: false, error: check.message }, { status: 403 });
    }

    // Pull this designer's own price history for the same garment type
    // (case-insensitive, excludes soft-deleted / cancelled orders).
    const priceStats = await Order.aggregate([
      {
        $match: {
          designerId: new mongoose.Types.ObjectId(designerId),
          isDeleted: { $ne: true },
          status: { $ne: "cancelled" },
          garmentType: { $regex: `^${garmentType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    const history: HistoricalPriceStats | null =
      priceStats.length > 0
        ? {
            garmentType,
            count: priceStats[0].count,
            avgPrice: priceStats[0].avgPrice,
            minPrice: priceStats[0].minPrice,
            maxPrice: priceStats[0].maxPrice,
          }
        : null;

    const designerDoc = await Designer.findById(designerId).select("city businessAddress").lean() as { city?: string } | null;

    const suggestion = await getPriceSuggestion({
      garmentType,
      fabric,
      description,
      currency: "NGN",
      measurements,
      fabricWidthCm,
      history,
      businessCity: designerDoc?.city,
    });

    logActivity({
      designerId,
      action: "ai_price_suggestion",
      entity: "order",
      details: `AI price suggestion for ${garmentType}: ₦${suggestion.suggestedPrice.toLocaleString()}`,
      metadata: { garmentType, suggestedPrice: suggestion.suggestedPrice, source: suggestion.source },
    });

    return NextResponse.json({
      success: true,
      data: suggestion,
      remaining: check.message,
    });
  } catch (error) {
    console.error("POST /api/ai/price-suggestion error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
