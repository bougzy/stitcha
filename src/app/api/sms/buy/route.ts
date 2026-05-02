import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { SMS_PACKS } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  POST /api/sms/buy                                                          */
/*  Body: { packId: "sms-50" | "sms-200" | "sms-500" }                         */
/*                                                                              */
/*  Initialises a Paystack transaction. Webhook (purpose=sms_pack) credits     */
/*  the designer's smsBalance after payment confirms.                          */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
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

    const { packId } = (await request.json()) as { packId?: string };
    const pack = SMS_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ success: false, error: "Unknown SMS pack" }, { status: 400 });
    }

    await connectDB();
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
        amount: pack.price * 100,
        currency: "NGN",
        callback_url: `${callbackBase}/settings?sms=success`,
        metadata: {
          purpose: "sms_pack",
          designerId: userId,
          packId: pack.id,
          smsCount: pack.count,
        },
      }),
    });
    const json = await paystackRes.json();
    if (!json.status) {
      return NextResponse.json(
        { success: false, error: json.message || "Failed to initialise payment" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: json.data.authorization_url,
        reference: json.data.reference,
        pack,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  GET /api/sms/buy → returns the SMS pack catalogue + the designer's balance */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const designer = await Designer.findById(userId)
      .select("smsBalance smsLifetimePurchased")
      .lean();
    const d = (designer as Record<string, unknown> | null) ?? {};

    return NextResponse.json({
      success: true,
      data: {
        balance: (d.smsBalance as number) ?? 0,
        lifetimePurchased: (d.smsLifetimePurchased as number) ?? 0,
        packs: SMS_PACKS,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
