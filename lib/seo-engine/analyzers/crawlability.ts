import { FetchedPage, fetchRobotsTxt, fetchSitemap } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

export async function analyzeCrawlability(page: FetchedPage): Promise<DimensionResult> {
  const findings: Finding[] = [];
  let score = 100;

  // HTTP status
  if (page.status >= 400) {
    findings.push({
      label: "Page returns an error status",
      status: "fail",
      detail: `The page responded with HTTP ${page.status}. Search engines can't index a page that errors.`,
      impact: "high",
      effort: "high",
    });
    score -= 40;
  } else {
    findings.push({
      label: "Page loads successfully",
      status: "pass",
      detail: `HTTP ${page.status}.`,
      impact: "low",
    });
  }

  // robots.txt
  const robotsTxt = await fetchRobotsTxt(page.url);
  if (robotsTxt === null) {
    findings.push({
      label: "No robots.txt found",
      status: "warn",
      detail: "A missing robots.txt isn't fatal, but it means there's no explicit crawl guidance for search engines.",
      impact: "medium",
      effort: "low",
    });
    score -= 10;
  } else {
    const blocksAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(\n|$)/i.test(robotsTxt);
    if (blocksAll) {
      findings.push({
        label: "robots.txt blocks all crawlers",
        status: "fail",
        detail: "The robots.txt file disallows all crawling from the site root — this would deindex the entire site.",
        impact: "high",
        effort: "low",
      });
      score -= 50;
    } else {
      findings.push({
        label: "robots.txt is present and permissive",
        status: "pass",
        detail: "robots.txt exists and doesn't block the site broadly.",
        impact: "low",
      });
    }
  }

  // sitemap.xml — check it's referenced in robots.txt, and that it exists
  const sitemap = await fetchSitemap(page.url);
  const sitemapReferencedInRobots = robotsTxt ? /sitemap:/i.test(robotsTxt) : false;
  if (sitemap === null) {
    findings.push({
      label: "No sitemap.xml found",
      status: "warn",
      detail: "A sitemap helps search engines discover and prioritize pages, especially on larger sites.",
      impact: "medium",
      effort: "low",
    });
    score -= 10;
  } else {
    findings.push({
      label: "sitemap.xml is present",
      status: "pass",
      detail: sitemapReferencedInRobots
        ? "Sitemap exists and is referenced in robots.txt."
        : "Sitemap exists, but isn't referenced in robots.txt — consider adding a Sitemap: line.",
      impact: "low",
    });
    if (!sitemapReferencedInRobots) score -= 3;
  }

  // Meta robots / noindex on the page itself
  const metaRobots = page.$('meta[name="robots"]').attr("content") ?? "";
  if (/noindex/i.test(metaRobots)) {
    findings.push({
      label: "Page has a noindex directive",
      status: "fail",
      detail: `The page's meta robots tag includes "${metaRobots}" — this actively tells search engines not to index it.`,
      impact: "high",
      effort: "low",
    });
    score -= 40;
  } else {
    findings.push({
      label: "No noindex directive",
      status: "pass",
      detail: "The page is not explicitly excluded from indexing.",
      impact: "low",
    });
  }

  // Canonical tag
  const canonical = page.$('link[rel="canonical"]').attr("href");
  if (!canonical) {
    findings.push({
      label: "Missing canonical tag",
      status: "warn",
      detail: "No <link rel=\"canonical\"> found. Without one, duplicate-content signals (query params, trailing slashes, http/https) can dilute ranking signals.",
      impact: "medium",
      effort: "low",
    });
    score -= 8;
  } else {
    findings.push({
      label: "Canonical tag present",
      status: "pass",
      detail: `Canonical points to ${canonical}.`,
      impact: "low",
    });
  }

  return {
    key: "crawlability",
    label: "Crawlability & Indexation",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
  };
}
