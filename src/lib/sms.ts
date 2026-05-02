/* -------------------------------------------------------------------------- */
/*  SMS — Termii client                                                         */
/*                                                                              */
/*  Sends a single SMS via the Termii REST API.                                */
/*  Phone numbers are normalised to international format (234XXXXXXXXXX).       */
/*  Returns { ok, messageId, error }.                                          */
/* -------------------------------------------------------------------------- */

const TERMII_BASE = "https://api.ng.termii.com";

export interface TermiiResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function normalisePhone(phone: string): string {
  let p = phone.replace(/[\s\-()+]/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (!p.startsWith("234")) p = "234" + p;
  return p;
}

export async function sendSMS(
  phone: string,
  message: string,
): Promise<TermiiResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "Stitcha";
  if (!apiKey) {
    return { ok: false, error: "SMS not configured (missing TERMII_API_KEY)" };
  }

  try {
    const res = await fetch(`${TERMII_BASE}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: normalisePhone(phone),
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
    const json = await res.json();
    if (!res.ok || json.code !== "ok") {
      return {
        ok: false,
        error: json.message || `Termii responded ${res.status}`,
      };
    }
    return { ok: true, messageId: json.message_id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMS send failed",
    };
  }
}
