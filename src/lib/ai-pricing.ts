/* -------------------------------------------------------------------------- */
/*  Stitcha AI — Price Recommendation                                          */
/*                                                                              */
/*  "Know exactly what to charge, every time."                                 */
/*                                                                              */
/*  Combines three things a designer usually has to guess-work in their head:  */
/*    1. Deterministic fabric yardage (already computed by fabric-calculator)  */
/*    2. This designer's own historical prices for the same garment type      */
/*    3. Garment complexity signals (embroidery, lining, layers, etc.)        */
/*                                                                              */
/*  ...and asks Claude to reason over them like an experienced business coach  */
/*  would, returning a suggested price range with plain-language reasoning     */
/*  the designer can act on (or ignore) in seconds.                            */
/* -------------------------------------------------------------------------- */

import { estimateFabric, type FabricEstimate } from "@/lib/fabric-calculator";

export interface HistoricalPriceStats {
  garmentType: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface PriceSuggestionInput {
  garmentType: string;
  fabric?: string;
  description?: string;
  currency: string;
  measurements?: Record<string, number | undefined>;
  fabricWidthCm?: number;
  history: HistoricalPriceStats | null;
  businessCity?: string;
}

export interface PriceSuggestion {
  suggestedPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  reasoning: string;
  factors: string[];
  fabricEstimate: FabricEstimate | null;
  source: "ai" | "heuristic";
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function amt(n: number, currency: string) {
  const symbol = currency === "NGN" ? "₦" : currency + " ";
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

/**
 * Fallback used when there's no Anthropic API key configured, or the AI
 * call fails. Keeps the feature usable (and honest) without ever blocking
 * the designer's workflow on a third-party outage.
 */
function heuristicSuggestion(input: PriceSuggestionInput, fabricEstimate: FabricEstimate | null): PriceSuggestion {
  const { history } = input;
  let base: number;
  const factors: string[] = [];

  if (history && history.count >= 2) {
    base = history.avgPrice;
    factors.push(`Based on your last ${history.count} ${input.garmentType} orders (avg ${amt(history.avgPrice, input.currency)})`);
  } else {
    // Rough NGN starting points by garment when there's no history at all —
    // deliberately conservative; the AI path does much better than this.
    const defaults: Record<string, number> = {
      agbada: 45000, kaftan: 40000, dress: 25000, gown: 30000,
      suit: 60000, blazer: 50000, trousers: 15000, pants: 15000,
      skirt: 12000, top: 10000, shirt: 12000, blouse: 12000, jumpsuit: 20000,
    };
    base = defaults[input.garmentType.toLowerCase()] || 20000;
    factors.push("Estimated from typical Nigerian market rates — add your own history over time for sharper suggestions.");
  }

  if (fabricEstimate) {
    factors.push(`Estimated ${fabricEstimate.totalYards} yards of fabric needed`);
  }

  return {
    suggestedPrice: Math.round(base / 500) * 500,
    priceRangeLow: Math.round((base * 0.85) / 500) * 500,
    priceRangeHigh: Math.round((base * 1.15) / 500) * 500,
    reasoning: "Quick estimate based on your order history and typical rates. Connect AI for a more tailored suggestion.",
    factors,
    fabricEstimate,
    source: "heuristic",
  };
}

export async function getPriceSuggestion(input: PriceSuggestionInput): Promise<PriceSuggestion> {
  const fabricEstimate = input.measurements
    ? estimateFabric(input.garmentType, input.measurements, input.fabricWidthCm || 114)
    : null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return heuristicSuggestion(input, fabricEstimate);
  }

  const historyLine = input.history && input.history.count > 0
    ? `This designer has completed ${input.history.count} previous "${input.history.garmentType}" order(s): average ${amt(input.history.avgPrice, input.currency)}, range ${amt(input.history.minPrice, input.currency)}–${amt(input.history.maxPrice, input.currency)}.`
    : `This designer has no prior order history for this garment type yet.`;

  const fabricLine = fabricEstimate
    ? `Estimated fabric needed: ${fabricEstimate.totalYards} yards (${fabricEstimate.breakdown.map((b) => b.label).join(", ")}).`
    : `No measurements provided yet, so fabric yardage is unknown.`;

  const prompt = `You are a pricing advisor for an independent fashion designer/tailor in ${input.businessCity || "Nigeria"}, using the Stitcha app. Recommend a fair price for this order.

Garment type: ${input.garmentType}
Fabric: ${input.fabric || "not specified"}
Description/notes: ${input.description || "none"}
Currency: ${input.currency}
${historyLine}
${fabricLine}

Consider: fabric cost (fabric is typically NOT included in this labor-focused estimate unless the designer's history suggests otherwise), garment complexity, typical local market rates, and the designer's own historical pricing (weight this heavily if present — don't suggest a price wildly different from their own track record without good reason).

Respond with ONLY a JSON object, no markdown fences, no preamble:
{
  "suggestedPrice": <number, rounded to nearest 500>,
  "priceRangeLow": <number>,
  "priceRangeHigh": <number>,
  "reasoning": "<2-3 sentences a designer could show a client, explaining the price>",
  "factors": ["<short factor 1>", "<short factor 2>", "<short factor 3, optional>"]
}`;

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
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("AI pricing: Anthropic API error", res.status, await res.text().catch(() => ""));
      return heuristicSuggestion(input, fabricEstimate);
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) return heuristicSuggestion(input, fabricEstimate);

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.suggestedPrice !== "number" ||
      typeof parsed.priceRangeLow !== "number" ||
      typeof parsed.priceRangeHigh !== "number"
    ) {
      return heuristicSuggestion(input, fabricEstimate);
    }

    return {
      suggestedPrice: parsed.suggestedPrice,
      priceRangeLow: parsed.priceRangeLow,
      priceRangeHigh: parsed.priceRangeHigh,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 4) : [],
      fabricEstimate,
      source: "ai",
    };
  } catch (err) {
    console.error("AI pricing: failed to get suggestion", err);
    return heuristicSuggestion(input, fabricEstimate);
  }
}
