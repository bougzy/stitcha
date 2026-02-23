/* -------------------------------------------------------------------------- */
/*  Style Vault — Curated fashion inspiration content                         */
/*  Rotates daily to keep content fresh                                        */
/* -------------------------------------------------------------------------- */

export interface StyleTip {
  id: string;
  category: "technique" | "trend" | "fabric" | "business" | "inspiration";
  title: string;
  content: string;
  tags: string[];
}

export interface TrendAlert {
  id: string;
  title: string;
  description: string;
  season: string;
  relevance: "high" | "medium";
}

export const STYLE_TIPS: StyleTip[] = [
  // Techniques
  {
    id: "t1",
    category: "technique",
    title: "The Perfect Dart Placement",
    content: "For a flattering fit on bustier clients, place bust darts 2-3cm below the apex point. This creates a natural silhouette without the dart appearing to 'point' at the bust. Always do a muslin test first.",
    tags: ["fitting", "darts", "women"],
  },
  {
    id: "t2",
    category: "technique",
    title: "Sleeve Ease Masterclass",
    content: "Add 2-3cm ease to the sleeve cap for comfortable arm movement. For agbada sleeves, increase to 5-7cm. Press the ease into the cap with steam before setting — never gather it. A smooth cap is the mark of a master.",
    tags: ["sleeves", "ease", "agbada"],
  },
  {
    id: "t3",
    category: "technique",
    title: "Clean Neckline Finish",
    content: "For a crisp neckline on a kaftan, use a bias-cut facing (3cm wide) and understitch 2mm from the seam. This prevents the facing from rolling outward. Grade the seam allowances for a flat finish.",
    tags: ["neckline", "kaftan", "finishing"],
  },
  {
    id: "t4",
    category: "technique",
    title: "Lining Without Bulk",
    content: "When lining aso-oke or thick brocade, use lightweight polyester lining. Cut the lining slightly smaller than the outer fabric to prevent it from showing. Catch-stitch at the waist and hemline only.",
    tags: ["lining", "aso-oke", "brocade"],
  },
  {
    id: "t5",
    category: "technique",
    title: "Perfect French Seams",
    content: "Trim the first seam to 3mm, press, then enclose with a 6mm seam. French seams work beautifully on chiffon and organza. They eliminate raw edges and add a professional finish that clients notice.",
    tags: ["seams", "chiffon", "finishing"],
  },
  {
    id: "t6",
    category: "technique",
    title: "Accurate Pattern Grading",
    content: "When grading between sizes, move each point proportionally. For bust: grade 1cm at side seam, 0.5cm at armhole. For waist: 1cm at side, 0.5cm at darts. Always re-draw curves after grading.",
    tags: ["pattern", "grading", "sizing"],
  },
  {
    id: "t7",
    category: "technique",
    title: "Hand-Rolled Hem Technique",
    content: "For a luxury finish on silk or chiffon, roll 3mm of fabric between thumb and finger, securing with tiny slip stitches every 5mm. Use matching silk thread. This technique elevates any garment from good to exceptional.",
    tags: ["hemming", "silk", "luxury"],
  },
  {
    id: "t8",
    category: "technique",
    title: "Invisible Zipper Installation",
    content: "Iron the zipper tape flat before sewing to open the coils. Use an invisible zipper foot and sew as close to the coils as possible. Start from the top and sew both sides in the same direction to prevent shifting.",
    tags: ["zipper", "finishing", "dresses"],
  },

  // Trends
  {
    id: "tr1",
    category: "trend",
    title: "Ankara Meets Minimalism",
    content: "The hottest trend right now is pairing bold Ankara prints with minimalist silhouettes. Think: a simple sheath dress in a striking print, or a tailored jumpsuit with one bold panel. Less structure, more print.",
    tags: ["ankara", "minimalism", "trending"],
  },
  {
    id: "tr2",
    category: "trend",
    title: "Sustainable Fashion Rising",
    content: "More Nigerian clients are asking about sustainable fabrics. Stock adire (tie-dye) and aso-oke — they're naturally sustainable, locally produced, and increasingly trendy. Marketing them as eco-friendly adds perceived value.",
    tags: ["sustainability", "adire", "aso-oke"],
  },
  {
    id: "tr3",
    category: "trend",
    title: "Cape Sleeves Are Back",
    content: "Cape sleeves are dominating owambe season. They add drama without the weight of full capes. Works beautifully on blouses and dresses. Pair with a fitted bodice for balance. Clients love the photo-ready silhouette.",
    tags: ["cape", "owambe", "sleeves"],
  },
  {
    id: "tr4",
    category: "trend",
    title: "Corset Details on Everything",
    content: "Corset-inspired boning and lacing details are everywhere. Add visible boning channels to structured bodices, or use corset lacing as a decorative back detail. It transforms simple designs into statement pieces.",
    tags: ["corset", "details", "structured"],
  },
  {
    id: "tr5",
    category: "trend",
    title: "Monochrome Power Dressing",
    content: "Single-color outfits are trending for both men and women. An all-white agbada or all-emerald dress makes a powerful statement. The key is playing with textures — mix matte and shiny fabrics in the same color.",
    tags: ["monochrome", "power", "agbada"],
  },
  {
    id: "tr6",
    category: "trend",
    title: "Asymmetric Hemlines",
    content: "Uneven hemlines are having a major moment. High-low skirts, one-shoulder dresses with diagonal hems, and wrap styles with cascading drapes. They create visual interest and photograph beautifully from every angle.",
    tags: ["asymmetric", "hemlines", "modern"],
  },

  // Fabric Knowledge
  {
    id: "f1",
    category: "fabric",
    title: "Working with Lace: Essential Tips",
    content: "Cut lace in a single layer to match motifs. Use a sharp rotary cutter, not scissors. Back with tulle for structure on bodices. For Nigerian cord lace, pre-wash in warm water to check for shrinkage. Always cut with the pattern direction.",
    tags: ["lace", "cord-lace", "cutting"],
  },
  {
    id: "f2",
    category: "fabric",
    title: "Ankara Care Guide",
    content: "Always pre-wash Ankara in cold water with vinegar to set the color. Some Ankara fabrics shrink up to 5% — account for this in cutting. Use a pressing cloth when ironing to prevent shine. Quality Ankara should survive 50+ washes.",
    tags: ["ankara", "care", "prewash"],
  },
  {
    id: "f3",
    category: "fabric",
    title: "Choosing the Right Interfacing",
    content: "Use woven fusible for collars and waistbands, knit fusible for stretch fabrics, and non-woven for crafts. Test on a scrap first — if it bubbles, reduce iron temperature. The right interfacing makes or breaks structured garments.",
    tags: ["interfacing", "structure", "essential"],
  },
  {
    id: "f4",
    category: "fabric",
    title: "Aso-Oke: The Premium Touch",
    content: "Hand-woven aso-oke is Nigeria's luxury fabric. Use a heavy needle (size 16) and longer stitch length (3.5mm). Don't press with high heat — it flattens the texture. Line all aso-oke garments for comfort against skin.",
    tags: ["aso-oke", "luxury", "weaving"],
  },
  {
    id: "f5",
    category: "fabric",
    title: "Velvet Season Prep",
    content: "Velvet requires single-direction cutting — run your hand over the fabric and cut with the nap running upward for rich color. Use a walking foot for sewing. Pin only in seam allowances to avoid marks. Steam, never iron directly.",
    tags: ["velvet", "seasonal", "technique"],
  },

  // Business
  {
    id: "b1",
    category: "business",
    title: "The 50% Deposit Rule",
    content: "Always collect at least 50% deposit before cutting fabric. This protects you from cancellations and covers material costs. Clients who pay upfront are 3x more likely to follow through and be satisfied with the final product.",
    tags: ["payment", "deposits", "protection"],
  },
  {
    id: "b2",
    category: "business",
    title: "Pricing Your Expertise",
    content: "Don't just charge for fabric and time. Factor in: your skill level, design consultation, fittings, alterations, and your brand value. A simple formula: (fabric cost × 2.5) + (hours × your hourly rate) + design fee.",
    tags: ["pricing", "business", "value"],
  },
  {
    id: "b3",
    category: "business",
    title: "Building a Referral Engine",
    content: "After every successful delivery, ask your client: 'Do you know someone who might need my services?' Offer 10% off their next order for each referral. Word-of-mouth is the most powerful marketing tool for fashion designers.",
    tags: ["referrals", "marketing", "growth"],
  },
  {
    id: "b4",
    category: "business",
    title: "Social Media Content Strategy",
    content: "Post on a 3-1-1 rotation: 3 portfolio photos, 1 behind-the-scenes process shot, 1 client testimonial or style tip. Post consistently at the same times. Tag clients (with permission) for organic reach.",
    tags: ["social-media", "marketing", "content"],
  },
  {
    id: "b5",
    category: "business",
    title: "Managing Client Expectations",
    content: "Set clear expectations upfront: delivery timeline, number of fittings included, alteration policy, and payment schedule. Put it in writing — even a simple WhatsApp message. This prevents 90% of disputes.",
    tags: ["communication", "clients", "management"],
  },

  // Inspiration
  {
    id: "i1",
    category: "inspiration",
    title: "Design Inspiration: Architecture",
    content: "Look at buildings for design ideas. The curves of a mosque dome can inspire a skirt shape. The geometric patterns of a modern building can become embroidery motifs. The best designers find inspiration outside fashion.",
    tags: ["inspiration", "creativity", "architecture"],
  },
  {
    id: "i2",
    category: "inspiration",
    title: "The Art of Color Pairing",
    content: "Nigerian fashion loves bold color. Master these combos: emerald + gold (royal), burgundy + peach (elegant), navy + coral (modern), purple + yellow (festive). Use the 70-30 rule: 70% dominant, 30% accent color.",
    tags: ["color", "pairing", "design"],
  },
  {
    id: "i3",
    category: "inspiration",
    title: "Fusion is the Future",
    content: "Blend traditional Nigerian silhouettes with contemporary details. An agbada with a modern collar. A wrapper skirt with structured pleats. An iro-and-buba set with a blazer twist. Clients want tradition with a modern edge.",
    tags: ["fusion", "traditional", "modern"],
  },
  {
    id: "i4",
    category: "inspiration",
    title: "Embellishment Ideas",
    content: "Elevate simple garments with strategic embellishment: crystal stones on a neckline, beaded tassels on sleeve hems, metallic thread embroidery on pocket flaps. The key is restraint — one statement area per garment.",
    tags: ["embellishment", "beading", "details"],
  },
];

export const TREND_ALERTS: TrendAlert[] = [
  {
    id: "ta1",
    title: "Owambe Season Peak",
    description: "December/January peak party season. Stock up on lace, aso-oke, and embellishments. Expect 40-60% more orders.",
    season: "Dec-Jan",
    relevance: "high",
  },
  {
    id: "ta2",
    title: "Easter Collections",
    description: "March/April brings demand for family matching outfits and church-appropriate styles. Pastel colors and modest designs trend.",
    season: "Mar-Apr",
    relevance: "high",
  },
  {
    id: "ta3",
    title: "Sallah Preparations",
    description: "Eid celebrations drive demand for kaftan, agbada, and modest women's wear. Rich fabrics and earth tones dominate.",
    season: "Varies",
    relevance: "high",
  },
  {
    id: "ta4",
    title: "Wedding Season Surge",
    description: "October-December is peak wedding season. Bridal parties need aso-ebi coordination. Offer group discounts for bridesmaids.",
    season: "Oct-Dec",
    relevance: "high",
  },
  {
    id: "ta5",
    title: "Back to School Rush",
    description: "September brings uniform orders and children's wear demand. Stock simple, durable fabrics and offer package deals.",
    season: "Aug-Sep",
    relevance: "medium",
  },
  {
    id: "ta6",
    title: "Valentine's Day Outfits",
    description: "February couples want matching or coordinated outfits. Red, wine, and pink fabrics sell fast. Market couple packages.",
    season: "Feb",
    relevance: "medium",
  },
];

export const CATEGORIES = [
  { key: "all", label: "All", icon: "✨" },
  { key: "technique", label: "Techniques", icon: "✂️" },
  { key: "trend", label: "Trends", icon: "🔥" },
  { key: "fabric", label: "Fabrics", icon: "🧵" },
  { key: "business", label: "Business", icon: "💼" },
  { key: "inspiration", label: "Inspiration", icon: "💡" },
] as const;

/**
 * Get today's featured content based on the day of year
 * Changes every day to keep it fresh
 */
export function getDailyContent(dayOffset = 0) {
  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + dayOffset;

  const featuredTip = STYLE_TIPS[dayOfYear % STYLE_TIPS.length];
  const featuredTrend = TREND_ALERTS[dayOfYear % TREND_ALERTS.length];

  return { featuredTip, featuredTrend };
}
