/* -------------------------------------------------------------------------- */
/*  Stitcha AI — Quotation Generator                                           */
/*                                                                              */
/*  Turns order details + a price into a warm, professional, client-ready      */
/*  WhatsApp quote message — the thing a designer would otherwise have to      */
/*  type out by hand (and often skip, or send half-heartedly).                 */
/*                                                                              */
/*  This is deliberately a THIN wrapper around a raw text message (not a       */
/*  rigid template like the rest of whatsapp.ts) because the value here is     */
/*  natural, persuasive copy — explaining what's included, why the price is    */
/*  fair, and what happens next — which a fill-in-the-blanks template can't    */
/*  do well.                                                                   */
/* -------------------------------------------------------------------------- */

import type { MessageLanguage } from "@/lib/whatsapp";

export interface QuotationInput {
  clientName: string;
  garmentType: string;
  fabric?: string;
  description?: string;
  price: number;
  currency: string;
  depositPercent?: number; // suggested deposit, e.g. 50
  dueDate?: string;
  businessName: string;
  lang: MessageLanguage;
}

export interface QuotationResult {
  message: string;
  source: "ai" | "heuristic";
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function amt(n: number, currency: string) {
  const symbol = currency === "NGN" ? "₦" : currency + " ";
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

/** Deterministic fallback — used when there's no API key or the AI call fails. */
function heuristicQuotation(input: QuotationInput): QuotationResult {
  const deposit = input.depositPercent
    ? Math.round((input.price * input.depositPercent) / 100)
    : undefined;
  const due = input.dueDate
    ? new Date(input.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : undefined;

  const lines: string[] = [];
  if (input.lang === "pidgin") {
    lines.push(`Hello ${input.clientName}! 👋`);
    lines.push(`\nThank you for reaching out about your *${input.garmentType}*${input.fabric ? ` in ${input.fabric}` : ""}.`);
    if (input.description) lines.push(`\n${input.description}`);
    lines.push(`\n*Price:* ${amt(input.price, input.currency)}`);
    if (deposit) lines.push(`*Deposit to start:* ${amt(deposit, input.currency)}`);
    if (due) lines.push(`*Ready by:* ${due}`);
    lines.push(`\nJust confirm and we go start work immediately. Thank you! 🙏\n\n— ${input.businessName}`);
  } else {
    lines.push(`Hi ${input.clientName},`);
    lines.push(`\nThank you for your interest in a *${input.garmentType}*${input.fabric ? ` in ${input.fabric}` : ""}.`);
    if (input.description) lines.push(`\n${input.description}`);
    lines.push(`\n*Price:* ${amt(input.price, input.currency)}`);
    if (deposit) lines.push(`*Deposit to begin:* ${amt(deposit, input.currency)}`);
    if (due) lines.push(`*Estimated ready date:* ${due}`);
    lines.push(`\nLet me know if you'd like to proceed and I'll get started right away. Thank you! 🙏\n\n— ${input.businessName}`);
  }

  return { message: lines.join("\n"), source: "heuristic" };
}

export async function generateQuotation(input: QuotationInput): Promise<QuotationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicQuotation(input);

  const deposit = input.depositPercent
    ? amt(Math.round((input.price * input.depositPercent) / 100), input.currency)
    : undefined;
  const due = input.dueDate
    ? new Date(input.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : undefined;

  const languageInstruction =
    input.lang === "pidgin"
      ? "Write in warm, natural Nigerian Pidgin English."
      : "Write in warm, professional Nigerian English (not overly formal — this is a WhatsApp message).";

  const prompt = `Write a short WhatsApp quotation message from a fashion designer to a prospective client. ${languageInstruction}

Client name: ${input.clientName}
Garment: ${input.garmentType}
Fabric: ${input.fabric || "not specified"}
Details: ${input.description || "none given"}
Price: ${amt(input.price, input.currency)}
${deposit ? `Suggested deposit to start: ${deposit}` : ""}
${due ? `Estimated ready date: ${due}` : ""}
Designer's business name: ${input.businessName}

Requirements:
- Open with a friendly greeting using the client's name.
- Briefly acknowledge the garment request.
- State the price clearly (bold it with *asterisks* — this is WhatsApp formatting).
- Include the deposit and ready date if given.
- End with a warm, low-pressure call to action to confirm, signed with the business name.
- Keep it under 100 words. No emoji spam — 1-2 max.
- Do not invent details not given above (no fake discounts, no fake timelines).

Respond with ONLY the message text. No preamble, no quotation marks around it, no markdown fences.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("AI quotation: Anthropic API error", res.status, await res.text().catch(() => ""));
      return heuristicQuotation(input);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    const message = textBlock?.text?.trim();

    if (!message) return heuristicQuotation(input);

    return { message, source: "ai" };
  } catch (err) {
    console.error("AI quotation: failed to generate", err);
    return heuristicQuotation(input);
  }
}
