import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { StyleTip } from "@/lib/models/style-tip";
import { STYLE_TIPS, TREND_ALERTS } from "@/lib/style-vault-data";

/* -------------------------------------------------------------------------- */
/*  GET /api/style-vault                                                       */
/*  Returns paginated tips, filterable by category/search/tag                 */
/*  Auto-seeds from static data if collection is empty                        */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Auto-seed: if the collection is empty, insert the static tips
    const count = await StyleTip.countDocuments();
    if (count === 0) {
      const seedDocs = STYLE_TIPS.map((tip) => ({
        title: tip.title,
        content: tip.content,
        category: tip.category,
        tags: tip.tags,
        viewCount: 0,
        bookmarkCount: 0,
      }));
      await StyleTip.insertMany(seedDocs);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "30"));

    // Build filter
    const filter: Record<string, unknown> = {};
    if (category && category !== "all") {
      filter.category = category;
    }
    if (tag) {
      filter.tags = tag;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const [tips, total] = await Promise.all([
      StyleTip.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StyleTip.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tips: JSON.parse(JSON.stringify(tips)),
        trendAlerts: TREND_ALERTS,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/style-vault error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/style-vault                                                      */
/*  Record a view for a tip (increment viewCount)                             */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tipId, action } = body;

    if (!tipId || action !== "view") {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    await connectDB();
    await StyleTip.findByIdAndUpdate(tipId, { $inc: { viewCount: 1 } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/style-vault error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
