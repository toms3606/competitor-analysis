import { fetchPage } from "../fetchPage";

export interface SiteProfile {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  bodyExcerpt: string;
  hasPricingPage: boolean;
  hasBlogOrResources: boolean;
}

export interface DimensionAssessment {
  label: string;
  brandAssessment: string;
  competitorAssessments: { url: string; assessment: string }[];
  brandPosition: "ahead" | "even" | "behind";
}

export interface ComparativeAnalysis {
  dimensions: DimensionAssessment[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

const DIMENSION_KEYS = [
  { key: "positioning", label: "Positioning & Messaging" },
  { key: "contentCadence", label: "Content Depth & Cadence" },
  { key: "aiVisibility", label: "AI Engine Visibility" },
  { key: "socialProof", label: "Social Proof & Trust Signals" },
  { key: "pricingTransparency", label: "Pricing Transparency" },
  { key: "brandVoice", label: "Brand Voice Consistency" },
] as const;

/** Fetches a URL and extracts the signals the comparative analyzer needs —
 *  separate from the SEO engine's own fetchPage/analyzer pipeline, since
 *  this is building a profile for an AI read, not a mechanical score. */
export async function buildSiteProfile(url: string): Promise<SiteProfile> {
  const page = await fetchPage(url);
  const $ = page.$;
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const h1 = $("h1").first().text().trim();
  const $body = $("body").clone();
  $body.find("nav, footer, script, style, header, aside").remove();
  const bodyExcerpt = $body.text().replace(/\s+/g, " ").trim().slice(0, 1800);

  const linksText = $("a[href]")
    .map((_, el) => ($(el).attr("href") || "").toLowerCase())
    .get()
    .join(" ");
  const hasPricingPage = /\/pricing|\/plans/.test(linksText);
  const hasBlogOrResources = /\/blog|\/resources|\/insights|\/articles/.test(linksText);

  return { url, title, metaDescription, h1, bodyExcerpt, hasPricingPage, hasBlogOrResources };
}

function profileBlock(label: string, p: SiteProfile): string {
  return `--- ${label}: ${p.url} ---
Title: ${p.title}
Meta description: ${p.metaDescription}
H1: ${p.h1}
Has a pricing/plans page linked: ${p.hasPricingPage ? "yes" : "no"}
Has a blog/resources section linked: ${p.hasBlogOrResources ? "yes" : "no"}
Body content excerpt: ${p.bodyExcerpt}`;
}

/**
 * The core comparative engine. One Anthropic call reads the brand's
 * site alongside up to 3 competitors' sites together, so every
 * judgment is genuinely relational — "how does this brand's
 * positioning compare to these specific competitors" — rather than
 * four independent per-site heuristics stitched together after the
 * fact. Returns null (section omitted) if ANTHROPIC_API_KEY isn't
 * configured or the call fails, same pattern as SEO Audit's
 * Detected Vertical / Detected Themes.
 */
export async function runComparativeAnalysis(
  brand: SiteProfile,
  competitors: SiteProfile[]
): Promise<ComparativeAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || competitors.length === 0) return null;

  const dimensionSchema = DIMENSION_KEYS.map(
    (d) => `    "${d.key}": {
      "brandAssessment": "1-2 sentence assessment of the BRAND on this dimension",
      "competitorAssessments": [${competitors.map((c) => `{"url": "${c.url}", "assessment": "1-2 sentences"}`).join(", ")}],
      "brandPosition": "ahead" | "even" | "behind" (relative to the competitors overall on this dimension)
    }`
  ).join(",\n");

  const prompt = `You are a brand strategist doing a genuine competitive analysis. You've been given the brand's own site plus up to 3 named competitors' sites. Read all of them and produce a real comparative judgment — not independent summaries, an actual comparison.

Respond with ONLY a JSON object (no markdown, no preamble):

{
  "dimensions": {
${dimensionSchema}
  },
  "swot": {
    "strengths": ["3-5 genuine strengths of the BRAND relative to these specific competitors"],
    "weaknesses": ["3-5 genuine weaknesses of the BRAND relative to these specific competitors"],
    "opportunities": ["3-5 opportunities visible from this comparison — gaps competitors have that the brand could exploit"],
    "threats": ["3-5 threats visible from this comparison — where competitors have a real edge that could hurt the brand"]
  }
}

Notes on "aiVisibility": you don't have live web access, so judge this based on how distinctly each site's content establishes clear entity signals (structured claims about who they are, what they do, and for whom) — sites with vague, generic copy are less likely to be confidently cited by AI engines than sites with clear, specific, well-structured claims about their business.

Be honest and specific. Generic praise or generic criticism is useless — ground every assessment in something actually visible in the content below.

${profileBlock("BRAND", brand)}

${competitors.map((c, i) => profileBlock(`COMPETITOR ${i + 1}`, c)).join("\n\n")}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const dimensions: DimensionAssessment[] = DIMENSION_KEYS.map(({ key, label }) => {
      const d = parsed.dimensions?.[key];
      return {
        label,
        brandAssessment: d?.brandAssessment ?? "",
        competitorAssessments: Array.isArray(d?.competitorAssessments) ? d.competitorAssessments : [],
        brandPosition: ["ahead", "even", "behind"].includes(d?.brandPosition) ? d.brandPosition : "even",
      };
    });

    const swot = {
      strengths: Array.isArray(parsed.swot?.strengths) ? parsed.swot.strengths : [],
      weaknesses: Array.isArray(parsed.swot?.weaknesses) ? parsed.swot.weaknesses : [],
      opportunities: Array.isArray(parsed.swot?.opportunities) ? parsed.swot.opportunities : [],
      threats: Array.isArray(parsed.swot?.threats) ? parsed.swot.threats : [],
    };

    if (dimensions.every((d) => !d.brandAssessment)) return null;

    return { dimensions, swot };
  } catch {
    return null;
  }
}
