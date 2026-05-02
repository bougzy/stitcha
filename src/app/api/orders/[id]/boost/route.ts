import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import { BOOST_PRICE_NGN, BOOST_DURATION_DAYS } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  POST /api/orders/[id]/boost                                                */
/*                                                                              */
/*  Initialises a Paystack transaction for a Discover-feed boost on this       */
/*  order. Only the order's owning designer may boost it, and only featured    */
/*  delivered orders are eligible.                                              */
/*                                                                              */
/*  On payment success, the webhook (purpose=boost_post) sets boostedUntil =   */
/*  now + 7 days and increments boostCount.                                    */
/* -------------------------------------------------------------------------- */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { success: false, error: "Payment system not configured.", needsConfig: true },
        { status: 503 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid order id" }, { status: 400 });
    }

    await connectDB();

    const order = await Order.findOne({
      _id: id,
      designerId: userId,
      isDeleted: { $ne: true },
    }).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const o = order as Record<string, unknown>;
    if (!o.featuredInFeed) {
      return NextResponse.json(
        { success: false, error: "Feature this post on Discover before boosting it." },
        { status: 400 },
      );
    }
    const gallery = (o.gallery as string[] | undefined) ?? [];
    if (gallery.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one photo to the gallery before boosting." },
        { status: 400 },
      );
    }

    const designer = await Designer.findById(userId).select("email").lean();
    if (!designer) {
      return NextResponse.json({ success: false, error: "Designer not found" }, { status: 404 });
    }

    const callbackBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: (designer as Record<string, unknown>).email,
        amount: BOOST_PRICE_NGN * 100, // kobo
        currency: "NGN",
        callback_url: `${callbackBase}/orders/${id}?boost=success`,
        metadata: {
          purpose: "boost_post",
          designerId: userId,
          orderId: id,
          durationDays: BOOST_DURATION_DAYS,
          orderTitle: o.title,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackData.status) {
      return NextResponse.json(
        { success: false, error: paystackData.message || "Failed to initialise payment" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        priceNGN: BOOST_PRICE_NGN,
        durationDays: BOOST_DURATION_DAYS,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Boost failed" },
      { status: 500 },
    );
  }
}
