import { cookies } from "next/headers";
import crypto from "crypto";

const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || "stitcha-admin-secret-key-2024";

/**
 * Verify the admin cookie token. Returns true if valid, false otherwise.
 * Use in any admin API route to gate access.
 */
export async function verifyAdminToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return false;

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
