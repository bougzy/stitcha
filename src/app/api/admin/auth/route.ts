import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/*  Hardcoded Admin Credentials                                                */
/*  Change these values for production or use environment variables            */
/* -------------------------------------------------------------------------- */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@stitcha.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Stitcha@Admin2024";

const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || "stitcha-admin-secret-key-2024";

function generateToken(email: string): string {
  const payload = `${email}:${Date.now() + 24 * 60 * 60 * 1000}`;
  const hmac = crypto
    .createHmac("sha256", ADMIN_TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const email = parts[0];
    const expiry = parseInt(parts[1]);
    const hmac = parts.slice(2).join(":");

    if (Date.now() > expiry) return false;

    const expectedHmac = crypto
      .createHmac("sha256", ADMIN_TOKEN_SECRET)
      .update(`${email}:${expiry}`)
      .digest("hex");

    return hmac === expectedHmac;
  } catch {
    return false;
  }
}

/** POST — Login */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const token = generateToken(email);

    const cookieStore = await cookies();
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      data: { email: ADMIN_EMAIL },
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** GET — Verify session */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { email: ADMIN_EMAIL },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }
}

/** DELETE — Logout */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return NextResponse.json({ success: true });
}
