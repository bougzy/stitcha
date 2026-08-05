/* -------------------------------------------------------------------------- */
/*  Stitcha AI — Caption Generator                                             */
/*                                                                              */
/*  Writes a short, scroll-stopping caption for a finished garment photo on    */
/*  the public Discover feed — the thing designers skip because they don't     */
/*  know what to say beyond "New order delivered ✅".                          */
/* -------------------------------------------------------------------------- */

export interface CaptionInput {
  garmentType: string;
  fabric?: string;
  description?: string;
  businessName: string;
  specialties?: string[];
}

export interface CaptionResult {
  caption: string;
  source: "ai" | "heuristic";
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

/** Deterministic fallback — used when there's no API key or the call fails. */
function heuristicCaption(input: CaptionInput): CaptionResult {
  const parts: string[] = [`${input.garmentType} ✨`];
  if (input.fabric) parts.push(`in ${input.fabric}`);
  parts.push(`— made by ${input.businessName}`);
  return { caption: parts.join(" "), source: "heuristic" };
}

export async function generateCaption(input: CaptionInput): Promise<CaptionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicCaption(input);

  const prompt = `Write ONE short, scroll-stopping caption for a fashion designer's finished garment photo on a public portfolio feed (like an Instagram caption, but shorter).

Garment: ${input.garmentType}
Fabric: ${input.fabric || "not specified"}
Notes: ${input.description || "none"}
Designer/brand: ${input.businessName}
Designer's specialties: ${(input.specialties || []).join(", ") || "not specified"}

Requirements:
- Under 140 characters.
- Confident, warm, a little stylish — not generic ("Beautiful piece! 😍" is banned).
- 1 emoji maximum, only if it genuinely fits.
- No hashtags.
- Do not invent details not given (no fake client names, no fake story).

Respond with ONLY the caption text. No quotes, no preamble, no markdown.`;

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
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("AI caption: Anthropic API error", res.status, await res.text().catch(() => ""));
      return heuristicCaption(input);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    const caption = textBlock?.text?.trim().replace(/^["']|["']$/g, "");

    if (!caption) return heuristicCaption(input);

    return { caption: caption.slice(0, 280), source: "ai" };
  } catch (err) {
    console.error("AI caption: failed to generate", err);
    return heuristicCaption(input);
  }
}
