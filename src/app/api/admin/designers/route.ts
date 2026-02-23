import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const sort = searchParams.get("sort") || "-createdAt";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) {
      filter.subscription = plan;
    }

    const [designers, total] = await Promise.all([
      Designer.find(filter)
        .select("-password -ownerPin -verificationToken -resetPasswordToken -resetPasswordExpires")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Designer.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        designers: JSON.parse(JSON.stringify(designers)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin designers error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
