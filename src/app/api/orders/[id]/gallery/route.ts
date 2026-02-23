import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";

const MAX_IMAGES = 6;
const MAX_SIZE_BYTES = 500_000; // ~500KB per image (base64)

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/gallery                                             */
/*  Add an image to the order gallery (base64 data URL)                       */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const { image, type = "gallery" } = body; // type: "gallery" | "fabric"

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "Invalid image data" },
        { status: 400 }
      );
    }

    if (image.length > MAX_SIZE_BYTES * 1.37) {
      // base64 is ~37% larger than raw
      return NextResponse.json(
        { success: false, error: "Image too large. Max 500KB." },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findOne({ _id: id, designerId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (type === "fabric") {
      // Fabric images (up to 4)
      if ((order.fabricImages || []).length >= 4) {
        return NextResponse.json(
          { success: false, error: "Maximum 4 fabric images allowed" },
          { status: 400 }
        );
      }
      order.fabricImages = order.fabricImages || [];
      order.fabricImages.push(image);
      await order.save();
      return NextResponse.json({
        success: true,
        message: "Fabric image added",
        data: { count: order.fabricImages.length },
      });
    }

    // Gallery images
    if ((order.gallery || []).length >= MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_IMAGES} images allowed` },
        { status: 400 }
      );
    }

    order.gallery = order.gallery || [];
    order.gallery.push(image);
    await order.save();

    return NextResponse.json({
      success: true,
      message: "Image added to gallery",
      data: { count: order.gallery.length },
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/gallery error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/orders/[id]/gallery                                           */
/*  Remove an image by index                                                  */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const index = parseInt(searchParams.get("index") || "-1", 10);

    await connectDB();

    const order = await Order.findOne({ _id: id, designerId });
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (index < 0 || index >= (order.gallery || []).length) {
      return NextResponse.json(
        { success: false, error: "Invalid image index" },
        { status: 400 }
      );
    }

    order.gallery.splice(index, 1);
    await order.save();

    return NextResponse.json({
      success: true,
      message: "Image removed",
      data: { count: order.gallery.length },
    });
  } catch (error) {
    console.error("DELETE /api/orders/[id]/gallery error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
