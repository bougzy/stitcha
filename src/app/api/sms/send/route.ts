import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { sendSMS } from "@/lib/sms";

/* -------------------------------------------------------------------------- */
/*  POST /api/sms/send                                                         */
/*  Body: { phone: string, message: string }                                   */
/*                                                                              */
/*  Atomically deducts ONE credit from the designer's smsBalance and sends    */
/*  the SMS via Termii. If Termii fails, the credit is refunded.              */
/* -------------------------------------------------------------------------- */

const MAX_LEN = 480; // ~3 SMS segments

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { phone, message } = (await request.json()) as {
      phone?: string;
      message?: string;
    };
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "phone and message are required" },
        { status: 400 },
      );
    }
    if (message.length > MAX_LEN) {
      return NextResponse.json(
        { success: false, error: `Message exceeds ${MAX_LEN} characters.` },
        { status: 400 },
      );
    }

    await connectDB();

    // Atomic decrement — only succeeds if balance > 0.
    const before = await Designer.findOneAndUpdate(
      { _id: userId, smsBalance: { $gt: 0 } },
      { $inc: { smsBalance: -1 } },
      { new: false, projection: { smsBalance: 1 } },
    );
    if (!before) {
      return NextResponse.json(
        {
          success: false,
          error: "No SMS credits left. Buy a pack to keep sending.",
          needsTopUp: true,
        },
        { status: 402 },
      );
    }

    const result = await sendSMS(phone, message);
    if (!result.ok) {
      // Refund the credit on send failure
      await Designer.updateOne({ _id: userId }, { $inc: { smsBalance: 1 } });
      return NextResponse.json(
        { success: false, error: result.error || "SMS send failed" },
        { status: 502 },
      );
    }

    const after = await Designer.findById(userId).select("smsBalance").lean();
    return NextResponse.json({
      success: true,
      data: {
        messageId: result.messageId,
        remaining: ((after as Record<string, unknown> | null)?.smsBalance as number) ?? 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
