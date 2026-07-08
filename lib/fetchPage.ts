import * as cheerio from "cheerio";

export interface FetchedPage {
  url: string;
  html: string;
  $: cheerio.CheerioAPI;
  status: number;
  headers: Headers;
  responseTimeMs: number;
}

/**
 * Fetches a URL and parses it with cheerio. Used by every analyzer so
 * we only make one network request per audited page instead of one per
 * dimension. Throws if the fetch fails outright (DNS, timeout, etc.) —
 * callers should catch this and record it as a hard "fail" finding
 * rather than letting the whole audit request 500.
 */
export async function fetchPage(url: string): Promise<FetchedPage> {
  const start = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WestwardSEOAudit/1.0; +https://westwardmarketinglab.com)",
    },
    // 15s timeout via AbortSignal so a hung site doesn't hang the audit.
    signal: AbortSignal.timeout(15000),
  });
  const responseTimeMs = Date.now() - start;
  const html = await res.text();
  const $ = cheerio.load(html);

  return { url, html, $, status: res.status, headers: res.headers, responseTimeMs };
}

/** Fetches robots.txt for the page's origin. Returns null if unreachable
 *  or a 404 — a missing robots.txt is not itself an error, just a
 *  finding for the crawlability analyzer to interpret. */
export async function fetchRobotsTxt(pageUrl: string): Promise<string | null> {
  try {
    const origin = new URL(pageUrl).origin;
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Fetches sitemap.xml for the page's origin, same graceful-null pattern. */
export async function fetchSitemap(pageUrl: string): Promise<string | null> {
  try {
    const origin = new URL(pageUrl).origin;
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
