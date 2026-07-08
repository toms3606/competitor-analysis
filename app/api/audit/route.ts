import { NextRequest } from "next/server";
import { fetchPage } from "@/lib/fetchPage";
import { runAllAnalyzers } from "@/lib/seo-engine/analyzers";
import { aggregateAudit } from "@/lib/seo-engine/scoring/aggregate";
import { buildSiteProfile, runComparativeAnalysis } from "@/lib/analyzers/comparative";
import { sql } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/cors";

export const maxDuration = 90;

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

export async function OPTIONS() {
  return corsPreflight();
}

async function seoVisibilityScore(url: string): Promise<number | null> {
  try {
    const page = await fetchPage(url);
    const dimensions = await runAllAnalyzers(page);
    return aggregateAudit(url, dimensions).overallScore;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { brandUrl?: string; competitorUrls?: string[]; email?: string };
  try {
    body = await req.json();
  } catch {
    return corsJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.brandUrl) {
    return corsJson({ error: "A brandUrl is required." }, { status: 400 });
  }

  const brandUrl = normalizeUrl(body.brandUrl);
  const competitorUrls = (body.competitorUrls ?? [])
    .map((u) => u?.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(normalizeUrl);

  if (competitorUrls.length === 0) {
    return corsJson({ error: "Enter at least 1 competitor URL (up to 3)." }, { status: 400 });
  }

  for (const u of [brandUrl, ...competitorUrls]) {
    try {
      new URL(u);
    } catch {
      return corsJson({ error: `"${u}" doesn't look like a valid URL.` }, { status: 400 });
    }
  }

  // Build content profiles for the comparative AI read, and run the
  // mechanical SEO score, for every site in parallel.
  let allProfiles;
  try {
    allProfiles = await Promise.all([buildSiteProfile(brandUrl), ...competitorUrls.map((u) => buildSiteProfile(u))]);
  } catch {
    return corsJson(
      { error: "Couldn't reach one of these URLs. Double-check they're correct and publicly accessible." },
      { status: 422 }
    );
  }
  const [profileBrand, ...profileCompetitors] = allProfiles;

  const seoScores = await Promise.all([
    seoVisibilityScore(brandUrl),
    ...competitorUrls.map((u) => seoVisibilityScore(u)),
  ]);
  const [brandSeoScore, ...competitorSeoScores] = seoScores;

  const comparative = await runComparativeAnalysis(profileBrand, profileCompetitors);

  const result = {
    brandUrl,
    competitorUrls,
    auditedAt: new Date().toISOString(),
    seoScores: {
      brand: brandSeoScore,
      competitors: competitorUrls.map((u, i) => ({ url: u, score: competitorSeoScores[i] })),
    },
    comparative,
  };

  const rows = await sql`
    INSERT INTO comp_audits (brand_url, competitor_urls, result, email)
    VALUES (${brandUrl}, ${JSON.stringify(competitorUrls)}, ${JSON.stringify(result)}, ${body.email ?? null})
    RETURNING id
  `;

  return corsJson({ auditId: rows[0].id, ...result });
}
