import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment system not configured. Please contact support.",
          needsConfig: true,
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan || plan.price === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    await connectDB();

    const designerId = (session.user as { id: string }).id;
    const designer = await Designer.findById(designerId);
    if (!designer) {
      return NextResponse.json(
        { success: false, error: "Designer not found" },
        { status: 404 }
      );
    }

    // Initialize Paystack transaction
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: designer.email,
          amount: plan.price * 100, // Paystack uses kobo (NGN * 100)
          currency: "NGN",
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/billing/callback`,
          metadata: {
            designerId: designer._id.toString(),
            planId: plan.id,
            planName: plan.name,
          },
        }),
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json(
        {
          success: false,
          error: paystackData.message || "Failed to initialize payment",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        accessCode: paystackData.data.access_code,
      },
    });
  } catch (error) {
    console.error("POST /api/billing/checkout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
