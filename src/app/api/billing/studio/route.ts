import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { STUDIO_ADDON } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  POST /api/billing/studio                                                   */
/*  Initialises a Paystack transaction for the Studio addon (₦1,000 / 30d).   */
/*  Webhook (purpose=studio_addon) extends Designer.studioAddon.expiresAt.    */
/*                                                                              */
/*  PUT /api/billing/studio                                                    */
/*  Body: { brandColor?, logoUrl?, customSlug? }                              */
/*  Allows the designer to update their Studio settings while active.         */
/* -------------------------------------------------------------------------- */

export async function POST() {
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
        amount: STUDIO_ADDON.price * 100,
        currency: "NGN",
        callback_url: `${callbackBase}/settings?studio=success`,
        metadata: {
          purpose: "studio_addon",
          designerId: userId,
          durationDays: STUDIO_ADDON.durationDays,
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
        priceNGN: STUDIO_ADDON.price,
        durationDays: STUDIO_ADDON.durationDays,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

/* GET — return the current designer's Studio status */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const designer = await Designer.findById(userId).select("studioAddon").lean();
    const studio = (designer as Record<string, unknown> | null)?.studioAddon as
      | { expiresAt?: Date | string; brandColor?: string; logoUrl?: string; customSlug?: string }
      | undefined;

    const expiresAt = studio?.expiresAt ? new Date(studio.expiresAt) : null;
    const active = !!expiresAt && expiresAt > new Date();

    return NextResponse.json({
      success: true,
      data: {
        active,
        expiresAt: expiresAt?.toISOString() ?? null,
        brandColor: studio?.brandColor || "#C75B39",
        logoUrl: studio?.logoUrl || null,
        customSlug: studio?.customSlug || null,
        price: STUDIO_ADDON.price,
        durationDays: STUDIO_ADDON.durationDays,
        features: STUDIO_ADDON.features,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

/* PUT — update brand color, logo, slug while Studio is active */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const designer = await Designer.findById(userId).select("studioAddon").lean();
    const studio = (designer as Record<string, unknown> | null)?.studioAddon as
      | { expiresAt?: Date | string }
      | undefined;
    const expiresAt = studio?.expiresAt ? new Date(studio.expiresAt) : null;
    if (!expiresAt || expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Studio addon is not active. Subscribe to use these settings." },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      brandColor?: string;
      logoUrl?: string;
      customSlug?: string;
    };
    const update: Record<string, unknown> = {};
    if (body.brandColor && /^#[0-9a-fA-F]{6}$/.test(body.brandColor)) {
      update["studioAddon.brandColor"] = body.brandColor;
    }
    if (body.logoUrl !== undefined) {
      update["studioAddon.logoUrl"] = body.logoUrl || null;
    }
    if (body.customSlug !== undefined) {
      const slug = body.customSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 32);
      if (slug && slug.length >= 3) {
        // Ensure uniqueness
        const taken = await Designer.findOne({ "studioAddon.customSlug": slug, _id: { $ne: userId } }).lean();
        if (taken) {
          return NextResponse.json(
            { success: false, error: "That URL is taken. Try another." },
            { status: 409 },
          );
        }
        update["studioAddon.customSlug"] = slug;
      } else if (slug === "") {
        update["studioAddon.customSlug"] = null;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }

    await Designer.updateOne({ _id: userId }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
