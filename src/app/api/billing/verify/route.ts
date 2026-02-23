import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";

export async function GET(request: NextRequest) {
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
        { success: false, error: "Not configured" },
        { status: 503 }
      );
    }

    const reference = request.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Missing reference" },
        { status: 400 }
      );
    }

    // Verify with Paystack
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );
    const data = await res.json();

    if (!data.status || data.data.status !== "success") {
      return NextResponse.json({
        success: false,
        error: "Payment verification failed",
        details: data.data?.gateway_response || "Unknown error",
      });
    }

    const { metadata } = data.data;
    const { designerId, planId } = metadata || {};
    const sessionUserId = (session.user as { id: string }).id;

    // Ensure the session user matches
    if (designerId !== sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Session mismatch" },
        { status: 403 }
      );
    }

    await connectDB();

    // Update subscription (backup in case webhook hasn't fired yet)
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);

    await Designer.findByIdAndUpdate(designerId, {
      subscription: planId,
      subscriptionExpiry,
      paystackCustomerId: data.data.customer?.customer_code,
    });

    return NextResponse.json({
      success: true,
      data: {
        planId,
        amount: data.data.amount / 100,
        reference: data.data.reference,
      },
    });
  } catch (error) {
    console.error("GET /api/billing/verify error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
