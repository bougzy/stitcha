import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/discover-posts                                              */
/*                                                                              */
/*  Moderation list. All featured-on-feed orders, including their boost,      */
/*  like, and impression counters, plus owning designer's basic profile.     */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const onlyBoosted = searchParams.get("boosted") === "1";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "60", 10), 1), 200);

    const filter: Record<string, unknown> = {
      featuredInFeed: true,
      isDeleted: { $ne: true },
    };
    if (onlyBoosted) filter.boostedUntil = { $gt: new Date() };

    const rows = await Order.find(filter)
      .select("title garmentType gallery feedCaption featuredAt boostedUntil boostCount feedLikes feedImpressions designerId")
      .sort({ boostedUntil: -1, featuredAt: -1 })
      .limit(limit)
      .lean();

    const designerIds = Array.from(
      new Set(rows.map((r) => String((r as unknown as Record<string, unknown>).designerId))),
    );
    const designers = await Designer.find({ _id: { $in: designerIds } })
      .select("name businessName city state suspended")
      .lean();
    const dMap = new Map(
      designers.map((d) => [
        String((d as unknown as Record<string, unknown>)._id),
        d as unknown as Record<string, unknown>,
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        posts: rows.map((r) => {
          const rr = r as unknown as Record<string, unknown>;
          const designer = dMap.get(String(rr.designerId));
          const boostActive =
            !!rr.boostedUntil && new Date(rr.boostedUntil as string).getTime() > Date.now();
          return {
            id: String(rr._id),
            title: rr.title,
            garmentType: rr.garmentType,
            caption: rr.feedCaption ?? null,
            heroImage:
              ((rr.gallery as string[] | undefined) ?? [])[0] ?? null,
            featuredAt: rr.featuredAt,
            boostedUntil: rr.boostedUntil ?? null,
            boostActive,
            boostCount: rr.boostCount ?? 0,
            likes: rr.feedLikes ?? 0,
            impressions: rr.feedImpressions ?? 0,
            designer: designer
              ? {
                  id: String(designer._id),
                  name: designer.name,
                  businessName: designer.businessName,
                  city: designer.city ?? null,
                  state: designer.state ?? null,
                  suspended: !!designer.suspended,
                }
              : null,
          };
        }),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
