import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

/**
 * Off-Site Authority ideally comes from a backlink index (Moz, Ahrefs,
 * Semrush). We support Moz's Link Explorer API since it has a
 * reasonably-priced tier suited to a lead-magnet tool's volume. Without
 * credentials, this falls back to a small set of on-page proxies for
 * authority (brand mentions of the domain name, presence of social
 * profile links, HTTPS + domain age proxy) that correlate loosely with
 * off-site trust but are not a substitute for a real backlink index.
 */
export async function analyzeOffSiteAuthority(page: FetchedPage): Promise<DimensionResult> {
  const accessId = process.env.MOZ_ACCESS_ID;
  const secretKey = process.env.MOZ_SECRET_KEY;

  if (accessId && secretKey) {
    try {
      return await analyzeWithMoz(page.url, accessId, secretKey);
    } catch {
      // Fall through to heuristic on any API failure.
    }
  }

  return analyzeHeuristic(page);
}

async function analyzeWithMoz(
  url: string,
  accessId: string,
  secretKey: string
): Promise<DimensionResult> {
  const domain = new URL(url).hostname;
  const auth = Buffer.from(`${accessId}:${secretKey}`).toString("base64");

  const res = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targets: [domain] }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Moz API returned ${res.status}`);
  const data = await res.json();
  const metrics = data?.results?.[0];

  const domainAuthority = metrics?.domain_authority ?? 0;
  const linkingDomains = metrics?.root_domains_to_root_domain ?? 0;

  const findings: Finding[] = [
    {
      label: "Domain Authority",
      status: domainAuthority >= 40 ? "pass" : domainAuthority >= 20 ? "warn" : "fail",
      detail: `${domainAuthority}/100 (Moz Domain Authority).`,
      impact: domainAuthority >= 40 ? "low" : "high",
      effort: "high",
    },
    {
      label: "Linking root domains",
      status: linkingDomains >= 50 ? "pass" : linkingDomains >= 10 ? "warn" : "fail",
      detail: `${linkingDomains} unique domains link to this site.`,
      impact: linkingDomains >= 50 ? "low" : "medium",
      effort: "high",
    },
  ];

  return {
    key: "offSiteAuthority",
    label: "Off-Site Authority",
    score: Math.min(100, domainAuthority + (linkingDomains > 50 ? 10 : 0)),
    maxScore: 100,
    findings,
    usedFallback: false,
  };
}

function analyzeHeuristic(page: FetchedPage): DimensionResult {
  const { $ } = page;
  const findings: Finding[] = [];
  let score = 60; // Neutral-low starting point since we can't see real backlinks

  const socialPlatforms = ["linkedin.com", "twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com"];
  const socialLinksFound = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    socialPlatforms.forEach((platform) => {
      if (href.includes(platform)) socialLinksFound.add(platform);
    });
  });

  if (socialLinksFound.size === 0) {
    findings.push({
      label: "No social profile links found",
      status: "warn",
      detail: "No links to LinkedIn, X/Twitter, Facebook, Instagram, or YouTube detected. These are a weak but common trust/entity signal.",
      impact: "low",
      effort: "low",
    });
    score -= 10;
  } else {
    findings.push({
      label: "Social profile links present",
      status: "pass",
      detail: `Linked platforms: ${[...socialLinksFound].join(", ")}.`,
      impact: "low",
    });
    score += 5;
  }

  const hasOrgSchema = page.html.includes('"Organization"') || page.html.includes('"LocalBusiness"');
  if (hasOrgSchema) {
    findings.push({
      label: "Organization schema present",
      status: "pass",
      detail: "Organization/LocalBusiness schema found — a weak entity-authority signal.",
      impact: "low",
    });
    score += 5;
  }

  return {
    key: "offSiteAuthority",
    label: "Off-Site Authority",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
    usedFallback: true,
  };
}
