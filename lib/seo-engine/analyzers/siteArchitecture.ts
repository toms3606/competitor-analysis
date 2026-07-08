import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

export async function analyzeSiteArchitecture(page: FetchedPage): Promise<DimensionResult> {
  const { $, url } = page;
  const findings: Finding[] = [];
  let score = 100;

  // URL structure: length, query params, readability
  const parsed = new URL(url);
  const hasQueryParams = parsed.search.length > 0;
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  const pathLooksReadable = pathSegments.every((seg) => !/^[0-9a-f]{20,}$/i.test(seg));

  if (hasQueryParams) {
    findings.push({
      label: "URL includes query parameters",
      status: "warn",
      detail: `${parsed.search} — query strings on canonical content URLs can create duplicate-content variants if not handled with canonical tags.`,
      impact: "low",
      effort: "medium",
    });
    score -= 5;
  }
  if (!pathLooksReadable) {
    findings.push({
      label: "URL path contains opaque IDs",
      status: "warn",
      detail: "Part of the URL path looks like a hash or database ID rather than a readable slug, which is a weaker relevance signal.",
      impact: "medium",
      effort: "high",
    });
    score -= 8;
  }
  if (!hasQueryParams && pathLooksReadable) {
    findings.push({
      label: "URL structure is clean",
      status: "pass",
      detail: `${parsed.pathname} reads as a human-friendly path.`,
      impact: "low",
    });
  }

  // Breadcrumb presence (visual, not just schema — schema is checked separately)
  const breadcrumbSelectors = [
    '[class*="breadcrumb" i]',
    '[aria-label="breadcrumb" i]',
    'nav[aria-label*="breadcrumb" i]',
  ];
  const hasBreadcrumbUI = breadcrumbSelectors.some((sel) => $(sel).length > 0);
  if (!hasBreadcrumbUI) {
    findings.push({
      label: "No visible breadcrumb navigation detected",
      status: "warn",
      detail: "Breadcrumbs help both users and search engines understand where a page sits in the site hierarchy.",
      impact: "low",
      effort: "medium",
    });
    score -= 5;
  } else {
    findings.push({
      label: "Breadcrumb navigation detected",
      status: "pass",
      detail: "Found breadcrumb-style navigation on the page.",
      impact: "low",
    });
  }

  // Internal link count (rough signal — page richness / hub-and-spoke structure)
  const origin = parsed.origin;
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.origin === origin) internalLinks++;
      else externalLinks++;
    } catch {
      // ignore malformed hrefs
    }
  });

  if (internalLinks < 3) {
    findings.push({
      label: "Very few internal links",
      status: "warn",
      detail: `Only ${internalLinks} internal links found. Internal linking distributes ranking signal and helps search engines discover related pages.`,
      impact: "medium",
      effort: "medium",
    });
    score -= 10;
  } else {
    findings.push({
      label: "Internal linking present",
      status: "pass",
      detail: `${internalLinks} internal links, ${externalLinks} external links found.`,
      impact: "low",
    });
  }

  return {
    key: "siteArchitecture",
    label: "Site Architecture",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
  };
}
