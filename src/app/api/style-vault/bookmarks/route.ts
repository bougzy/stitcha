import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { StyleBookmark, StyleTip } from "@/lib/models/style-tip";

/* -------------------------------------------------------------------------- */
/*  GET /api/style-vault/bookmarks                                             */
/*  Returns designer's bookmarked tip IDs                                     */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    await connectDB();

    const bookmarks = await StyleBookmark.find({ designerId }).select("tipId").lean();
    const tipIds = bookmarks.map((b) => b.tipId.toString());

    return NextResponse.json({ success: true, data: { bookmarks: tipIds } });
  } catch (error) {
    console.error("GET /api/style-vault/bookmarks error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/style-vault/bookmarks                                            */
/*  Toggle bookmark: add if not exists, remove if exists                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { tipId } = body;

    if (!tipId) {
      return NextResponse.json({ success: false, error: "tipId is required" }, { status: 400 });
    }

    await connectDB();

    const existing = await StyleBookmark.findOne({ designerId, tipId });
    if (existing) {
      // Remove bookmark
      await StyleBookmark.deleteOne({ _id: existing._id });
      await StyleTip.findByIdAndUpdate(tipId, { $inc: { bookmarkCount: -1 } });
      return NextResponse.json({ success: true, data: { bookmarked: false } });
    } else {
      // Add bookmark
      await StyleBookmark.create({ designerId, tipId });
      await StyleTip.findByIdAndUpdate(tipId, { $inc: { bookmarkCount: 1 } });
      return NextResponse.json({ success: true, data: { bookmarked: true } });
    }
  } catch (error) {
    console.error("POST /api/style-vault/bookmarks error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
