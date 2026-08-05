/* -------------------------------------------------------------------------- */
/*  Stitcha AI — Broadcast Message Writer                                     */
/*                                                                              */
/*  Writes a WhatsApp/SMS broadcast message tailored to the selected client    */
/*  segment's situation (a debtor needs a different tone than a VIP), so a     */
/*  designer doesn't have to pick from the same few static templates every    */
/*  time. Always preserves the {{first_name}} personalisation token so the    */
/*  existing broadcast send flow keeps working unchanged.                     */
/* -------------------------------------------------------------------------- */

export interface BroadcastMessageInput {
  segment: string;
  segmentDescription: string;
  goal?: string;
  lang: "english" | "pidgin";
  businessName: string;
}

export interface BroadcastMessageResult {
  message: string;
  source: "ai" | "heuristic";
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function heuristicMessage(input: BroadcastMessageInput): BroadcastMessageResult {
  const base =
    input.lang === "pidgin"
      ? `Hello {{first_name}}! 👋 ${input.goal || "Just dey check up on you."} Reply make we talk. Thank you! 🙏\n\n— ${input.businessName}`
      : `Hi {{first_name}}! 👋 ${input.goal || "Just checking in with you."} Let me know if you'd like to chat. Thank you! 🙏\n\n— ${input.businessName}`;
  return { message: base, source: "heuristic" };
}

export async function generateBroadcastMessage(
  input: BroadcastMessageInput
): Promise<BroadcastMessageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicMessage(input);

  const languageInstruction =
    input.lang === "pidgin"
      ? "Write in warm, natural Nigerian Pidgin English."
      : "Write in warm, professional Nigerian English (this is a WhatsApp message, not an email).";

  const prompt = `Write a short WhatsApp broadcast message from a fashion designer to a group of clients. ${languageInstruction}

Client segment: ${input.segment} — ${input.segmentDescription}
What the designer wants to say (may be blank, use your judgement based on the segment): ${input.goal || "not specified — infer a sensible message for this segment"}
Designer's business name: ${input.businessName}

Requirements:
- Must include the literal token {{first_name}} exactly once, near the start, for personalisation (e.g. "Hi {{first_name}},").
- Match the tone to the segment (e.g. a payment reminder for "owe money" should be gentle but clear; a win-back message for "dormant" clients should feel warm, not guilt-tripping; a VIP message should feel appreciative).
- Under 400 characters.
- 1-2 emoji maximum.
- End signed with the business name.
- Do not invent specific amounts, dates, or discounts not given.

Respond with ONLY the message text. No preamble, no quotes, no markdown fences.`;

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
      console.error("AI broadcast: Anthropic API error", res.status, await res.text().catch(() => ""));
      return heuristicMessage(input);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    let message = textBlock?.text?.trim();

    if (!message) return heuristicMessage(input);

    // Safety net: if the model somehow dropped the token, prepend a greeting
    // that includes it, so the send flow's personalise() still works.
    if (!message.includes("{{first_name}}")) {
      message = `Hi {{first_name}}! ${message}`;
    }

    return { message, source: "ai" };
  } catch (err) {
    console.error("AI broadcast: failed to generate", err);
    return heuristicMessage(input);
  }
}
