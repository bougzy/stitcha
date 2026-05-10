import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { ManualPayment, type ManualPaymentPurpose } from "@/lib/models/manual-payment";
import { Designer } from "@/lib/models/designer";
import { Notification } from "@/lib/models/notification";
import { notifyAdmin } from "@/lib/admin-notify";
import {
  SUBSCRIPTION_PLANS,
  SMS_PACKS,
  STUDIO_ADDON,
  BOOST_PRICE_NGN,
  BANK_DETAILS,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  /api/manual-payments                                                       */
/*                                                                              */
/*  POST — designer submits a new bank-transfer payment record.                */
/*  GET  — designer lists their own past + pending submissions.                */
/* -------------------------------------------------------------------------- */

function shortReference(): string {
  // Human-friendly + unique enough for bank narration: STC-XYZ123
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `STC-${s}`;
}

interface PostBody {
  purpose?: ManualPaymentPurpose;
  amount?: number;
  payload?: {
    planId?: "free" | "plus" | "pro";
    orderId?: string;
    packId?: string;
    durationDays?: number;
  };
  proofImage?: string;
  senderName?: string;
  senderBank?: string;
  designerNote?: string;
}

/**
 * Validate that the amount the designer says they sent matches the price
 * we expect for that purpose. We accept the price exactly OR up to 2 % over
 * (some banks add a transfer fee narration).
 */
function expectedAmount(
  purpose: ManualPaymentPurpose,
  payload: PostBody["payload"],
): number | null {
  if (purpose === "subscription") {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === payload?.planId);
    return plan && plan.price > 0 ? plan.price : null;
  }
  if (purpose === "boost_post") return BOOST_PRICE_NGN;
  if (purpose === "sms_pack") {
    const pack = SMS_PACKS.find((p) => p.id === payload?.packId);
    return pack ? pack.price : null;
  }
  if (purpose === "studio_addon") return STUDIO_ADDON.price;
  return null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PostBody;
    const purpose = body.purpose;
    if (!purpose || !["subscription", "boost_post", "sms_pack", "studio_addon"].includes(purpose)) {
      return NextResponse.json({ success: false, error: "Invalid purpose" }, { status: 400 });
    }

    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    const expected = expectedAmount(purpose, body.payload);
    if (!expected) {
      return NextResponse.json(
        { success: false, error: "Couldn't price that purchase. Pick a plan/pack first." },
        { status: 400 },
      );
    }
    // Allow exact match or slightly higher (transfer fees) — reject under-payment.
    if (amount + 1 < expected) {
      return NextResponse.json(
        {
          success: false,
          error: `That amount looks low — expected ₦${expected.toLocaleString("en-NG")}.`,
          expected,
        },
        { status: 400 },
      );
    }

    await connectDB();

    // Block duplicate pending submissions for the same purpose+payload combo
    const dupQuery: Record<string, unknown> = {
      designerId: userId,
      status: "pending",
      purpose,
    };
    if (body.payload?.orderId) dupQuery["payload.orderId"] = body.payload.orderId;
    if (body.payload?.planId)  dupQuery["payload.planId"]  = body.payload.planId;
    if (body.payload?.packId)  dupQuery["payload.packId"]  = body.payload.packId;
    const dup = await ManualPayment.findOne(dupQuery).lean();
    if (dup) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a pending payment for this. Wait for admin to verify it.",
          existing: { id: String((dup as unknown as { _id: unknown })._id) },
        },
        { status: 409 },
      );
    }

    const designer = await Designer.findById(userId).select("name businessName email").lean();
    const d = (designer as unknown as Record<string, unknown> | null) ?? null;

    const reference = shortReference();
    const record = await ManualPayment.create({
      designerId: userId,
      purpose,
      amount,
      reference,
      payload: body.payload || {},
      proofImage:   body.proofImage,
      senderName:   body.senderName,
      senderBank:   body.senderBank,
      designerNote: body.designerNote,
      status: "pending",
    });

    // Heads-up notification to the designer
    Notification.create({
      designerId: userId,
      type: "system",
      title: "📝 Payment submitted",
      message: `We've received your ${purpose.replace("_", " ")} payment for review. We'll activate it as soon as it's verified.`,
      link: "/billing",
    }).catch(() => { /* non-fatal */ });

    // Admin alert — appears in the admin bell and on /admin overview
    const designerLabel =
      (d?.businessName as string | undefined) || (d?.name as string | undefined) || "A designer";
    notifyAdmin({
      kind: "manual_payment_submitted",
      severity: "action_required",
      title: `💰 New ${purpose.replace("_", " ")} payment — ₦${amount.toLocaleString("en-NG")}`,
      message: `${designerLabel} submitted reference ${reference}. Verify to activate.`,
      link: "/admin/payments",
      designerId: userId,
      meta: {
        reference,
        amount,
        purpose,
        payload: body.payload,
      },
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({
      success: true,
      data: {
        id: String((record as unknown as { _id: unknown })._id),
        reference,
        amount,
        bank: BANK_DETAILS,
        status: "pending",
        designer: {
          name: d?.name as string | undefined,
          businessName: d?.businessName as string | undefined,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Submit failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const rows = await ManualPayment.find({ designerId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        bank: BANK_DETAILS,
        payments: rows.map((r) => {
          const rr = r as unknown as Record<string, unknown>;
          return {
            id: String(rr._id),
            purpose: rr.purpose,
            amount: rr.amount,
            reference: rr.reference,
            status: rr.status,
            payload: rr.payload,
            adminNote: rr.adminNote,
            createdAt: rr.createdAt,
            verifiedAt: rr.verifiedAt,
            rejectedAt: rr.rejectedAt,
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
