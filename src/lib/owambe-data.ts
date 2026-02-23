/* -------------------------------------------------------------------------- */
/*  Owambe Calendar — Nigerian Events & Seasonal Planning Data                */
/*  Helps designers anticipate demand and plan their business                 */
/* -------------------------------------------------------------------------- */

export interface NigerianEvent {
  id: string;
  name: string;
  emoji: string;
  month: number; // 1-12
  day?: number; // if fixed date
  isVariable?: boolean; // e.g., Easter, Eid
  description: string;
  demandLevel: "extreme" | "high" | "medium";
  popularGarments: string[];
  fabricTrends: string[];
  tip: string;
  prepWeeks: number; // how many weeks before to start preparing
}

export const NIGERIAN_EVENTS: NigerianEvent[] = [
  {
    id: "new-year",
    name: "New Year Celebrations",
    emoji: "🎆",
    month: 1,
    day: 1,
    description: "New Year parties, church services, and family gatherings",
    demandLevel: "high",
    popularGarments: ["dress", "agbada", "suit", "top"],
    fabricTrends: ["Sequined fabrics", "Velvet", "Lace", "Gold accents"],
    tip: "Offer 'New Year, New Outfit' packages. Upsell accessories.",
    prepWeeks: 6,
  },
  {
    id: "valentines",
    name: "Valentine's Day",
    emoji: "❤️",
    month: 2,
    day: 14,
    description: "Couples want matching or coordinated outfits for dates and parties",
    demandLevel: "medium",
    popularGarments: ["dress", "suit", "top"],
    fabricTrends: ["Red fabrics", "Wine/Burgundy", "Pink/Blush", "Satin"],
    tip: "Market couple packages — matching fabrics, complementary colors. Offer discounts for pairs.",
    prepWeeks: 4,
  },
  {
    id: "easter",
    name: "Easter",
    emoji: "✝️",
    month: 4,
    day: 20,
    isVariable: true,
    description: "Church services, family visits, and Easter parties. Family matching outfits popular.",
    demandLevel: "high",
    popularGarments: ["dress", "suit", "agbada", "skirt"],
    fabricTrends: ["Pastels", "White lace", "Light fabrics", "Floral prints"],
    tip: "Family package deals (4+ matching outfits). Focus on modest, elegant styles for church.",
    prepWeeks: 6,
  },
  {
    id: "mothers-day",
    name: "Mother's Day",
    emoji: "👩‍👧",
    month: 3,
    day: 14,
    description: "Gift orders for mothers. Elegant, comfortable styles in demand.",
    demandLevel: "medium",
    popularGarments: ["dress", "top", "skirt"],
    fabricTrends: ["Ankara", "Lace", "Soft fabrics", "Earth tones"],
    tip: "Offer gift vouchers. Suggest mother-daughter matching outfits.",
    prepWeeks: 3,
  },
  {
    id: "eid-al-fitr",
    name: "Eid al-Fitr (Sallah)",
    emoji: "🌙",
    month: 4,
    isVariable: true,
    description: "Major celebration after Ramadan. Huge demand for kaftan, agbada, and modest women's wear.",
    demandLevel: "extreme",
    popularGarments: ["agbada", "dress", "suit"],
    fabricTrends: ["Guinea brocade", "Shadda", "Lace", "Rich earth tones"],
    tip: "Start taking orders 6-8 weeks before. Offer early-bird pricing. Stock up on guinea brocade.",
    prepWeeks: 8,
  },
  {
    id: "democracy-day",
    name: "Democracy Day",
    emoji: "🇳🇬",
    month: 6,
    day: 12,
    description: "National holiday. Green-white-green themed events and parties.",
    demandLevel: "medium",
    popularGarments: ["agbada", "dress", "top"],
    fabricTrends: ["Green fabrics", "White", "National colors"],
    tip: "Offer patriotic-themed designs. Green and white combinations sell well.",
    prepWeeks: 3,
  },
  {
    id: "eid-al-adha",
    name: "Eid al-Adha",
    emoji: "🐑",
    month: 6,
    isVariable: true,
    description: "Feast of Sacrifice. Similar demand to Eid al-Fitr with emphasis on family outfits.",
    demandLevel: "extreme",
    popularGarments: ["agbada", "dress", "suit"],
    fabricTrends: ["Guinea brocade", "Atiku", "Cashmere", "Premium lace"],
    tip: "Family matching sets sell fast. Offer bulk discounts for family orders.",
    prepWeeks: 8,
  },
  {
    id: "back-to-school",
    name: "Back to School Season",
    emoji: "📚",
    month: 9,
    day: 1,
    description: "School uniforms, children's formal wear, and teacher appreciation outfits.",
    demandLevel: "medium",
    popularGarments: ["top", "trousers", "skirt"],
    fabricTrends: ["Durable cottons", "Polyester blends", "School colors"],
    tip: "Offer school uniform packages. Quick turnaround wins here.",
    prepWeeks: 4,
  },
  {
    id: "independence-day",
    name: "Independence Day",
    emoji: "🇳🇬",
    month: 10,
    day: 1,
    description: "National celebration. Corporate events, government functions, and patriotic parties.",
    demandLevel: "medium",
    popularGarments: ["agbada", "suit", "dress"],
    fabricTrends: ["Green fabrics", "White", "Gold accents"],
    tip: "Corporate orders peak around this time. Market to businesses.",
    prepWeeks: 4,
  },
  {
    id: "wedding-season",
    name: "Wedding Season Peak",
    emoji: "💍",
    month: 11,
    day: 1,
    description: "November marks the peak of wedding season. Aso-ebi orders dominate.",
    demandLevel: "extreme",
    popularGarments: ["dress", "agbada", "suit", "jumpsuit"],
    fabricTrends: ["Aso-oke", "French lace", "Sequined fabrics", "Silk"],
    tip: "Offer aso-ebi group coordination. Volume discounts for bridal party of 10+. Start booking early.",
    prepWeeks: 8,
  },
  {
    id: "detty-december",
    name: "Detty December / Owambe Season",
    emoji: "🎉",
    month: 12,
    day: 1,
    description: "The BIGGEST season. Parties every weekend, weddings, concerts, family gatherings, and corporate events.",
    demandLevel: "extreme",
    popularGarments: ["dress", "agbada", "suit", "jumpsuit", "skirt"],
    fabricTrends: ["Luxury lace", "Velvet", "Sequins", "Aso-oke", "Brocade"],
    tip: "This is your money month. Start marketing in October. Charge premium prices. Consider hiring temporary help.",
    prepWeeks: 10,
  },
  {
    id: "christmas",
    name: "Christmas & Boxing Day",
    emoji: "🎄",
    month: 12,
    day: 25,
    description: "Church services, family reunions, and holiday parties. Red and green themes.",
    demandLevel: "high",
    popularGarments: ["dress", "agbada", "suit", "top"],
    fabricTrends: ["Red fabrics", "Green", "Gold", "Glitter fabrics"],
    tip: "Family matching Christmas outfits are a goldmine. Market early!",
    prepWeeks: 6,
  },
];

export interface SeasonalInsight {
  month: number;
  monthName: string;
  demandLevel: "low" | "medium" | "high" | "peak";
  events: NigerianEvent[];
  tip: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthlyInsights(): SeasonalInsight[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const events = NIGERIAN_EVENTS.filter((e) => e.month === month);
    const hasExtreme = events.some((e) => e.demandLevel === "extreme");
    const hasHigh = events.some((e) => e.demandLevel === "high");

    let demandLevel: "low" | "medium" | "high" | "peak";
    if (hasExtreme) demandLevel = "peak";
    else if (hasHigh) demandLevel = "high";
    else if (events.length > 0) demandLevel = "medium";
    else demandLevel = "low";

    const tips: Record<string, string> = {
      "1": "Start the year strong. Use holiday momentum for January orders.",
      "2": "Valentine's couples market. Slow month otherwise — use for skill development.",
      "3": "Pre-Easter rush begins. Prepare patterns and stock fabrics.",
      "4": "Easter + Eid season. Maximum capacity needed. Consider help.",
      "5": "Post-holiday lull. Perfect time for marketing and portfolio updates.",
      "6": "Mid-year events pick up. Start planning for Q4 rush.",
      "7": "Quiet month. Ideal for new designs, pricing reviews, and networking.",
      "8": "Prepare for back-to-school. Start marketing September event outfits.",
      "9": "Back-to-school orders. Begin accepting October event bookings.",
      "10": "Wedding season begins. Book capacity now. Independence Day orders.",
      "11": "Wedding season peak. Work at maximum capacity. Manage expectations.",
      "12": "Detty December! Your biggest month. Premium pricing is justified.",
    };

    return {
      month,
      monthName: MONTH_NAMES[i],
      demandLevel,
      events,
      tip: tips[String(month)] || "",
    };
  });
}

export function getUpcomingEvents(count = 5): (NigerianEvent & { daysUntil: number; prepStartsIn: number })[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  return NIGERIAN_EVENTS
    .map((event) => {
      const eventDay = event.day || 15; // Default to mid-month for variable dates
      let eventDate = new Date(now.getFullYear(), event.month - 1, eventDay);

      // If the event has passed this year, look at next year
      if (eventDate < now) {
        eventDate = new Date(now.getFullYear() + 1, event.month - 1, eventDay);
      }

      const daysUntil = Math.ceil(
        (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const prepStartsIn = Math.max(0, daysUntil - event.prepWeeks * 7);

      return { ...event, daysUntil, prepStartsIn };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, count);
}
