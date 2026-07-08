import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

/**
 * Technical Performance uses Google's PageSpeed Insights API when
 * GOOGLE_PAGESPEED_API_KEY is configured, since that's the only reliable
 * source for real Core Web Vitals (LCP, CLS, INP) without running a
 * headless browser ourselves. Without a key, it falls back to a
 * heuristic based on response time and page weight — directionally
 * useful, but explicitly flagged as an estimate on the results page via
 * usedFallback.
 */
export async function analyzeTechnicalPerformance(page: FetchedPage): Promise<DimensionResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (apiKey) {
    try {
      return await analyzeWithPageSpeed(page.url, apiKey);
    } catch {
      // Fall through to heuristic if the API call fails for any reason
      // (rate limit, malformed response, etc.) rather than failing the
      // whole audit.
    }
  }

  return analyzeHeuristic(page);
}

async function analyzeWithPageSpeed(url: string, apiKey: string): Promise<DimensionResult> {
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    url
  )}&key=${apiKey}&category=performance&strategy=mobile`;

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`PageSpeed API returned ${res.status}`);
  const data = await res.json();

  const perfScore = Math.round((data?.laghthouseResult?.categories?.performance?.score ?? data?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
  const audits = data?.lighthouseResult?.audits ?? {};
  const lcp = audits["largest-contentful-paint"]?.displayValue ?? "unknown";
  const cls = audits["cumulative-layout-shift"]?.displayValue ?? "unknown";
  const tbt = audits["total-blocking-time"]?.displayValue ?? "unknown";

  const findings: Finding[] = [
    {
      label: "Lighthouse Performance score",
      status: perfScore >= 90 ? "pass" : perfScore >= 50 ? "warn" : "fail",
      detail: `${perfScore}/100 (mobile), via Google PageSpeed Insights.`,
      impact: perfScore >= 90 ? "low" : "high",
      effort: "high",
    },
    {
      label: "Largest Contentful Paint (LCP)",
      status: audits["largest-contentful-paint"]?.score >= 0.9 ? "pass" : "warn",
      detail: `${lcp} — measures loading performance; under 2.5s is considered good.`,
      impact: "medium",
      effort: "high",
    },
    {
      label: "Cumulative Layout Shift (CLS)",
      status: audits["cumulative-layout-shift"]?.score >= 0.9 ? "pass" : "warn",
      detail: `${cls} — measures visual stability; under 0.1 is considered good.`,
      impact: "medium",
      effort: "medium",
    },
    {
      label: "Total Blocking Time (TBT)",
      status: audits["total-blocking-time"]?.score >= 0.9 ? "pass" : "warn",
      detail: `${tbt} — measures interactivity delay.`,
      impact: "medium",
      effort: "high",
    },
  ];

  return {
    key: "technicalPerformance",
    label: "Technical Performance",
    score: perfScore,
    maxScore: 100,
    findings,
    usedFallback: false,
  };
}

function analyzeHeuristic(page: FetchedPage): DimensionResult {
  const findings: Finding[] = [];
  let score = 100;

  const isHttps = page.url.startsWith("https://");
  if (!isHttps) {
    findings.push({
      label: "Not served over HTTPS",
      status: "fail",
      detail: "HTTPS is a baseline ranking factor and a browser trust signal. Non-HTTPS pages are flagged 'Not Secure' in Chrome.",
      impact: "high",
      effort: "medium",
    });
    score -= 30;
  } else {
    findings.push({
      label: "Served over HTTPS",
      status: "pass",
      detail: "Page loads securely.",
      impact: "low",
    });
  }

  if (page.responseTimeMs > 2000) {
    findings.push({
      label: "Slow server response time",
      status: "fail",
      detail: `Server took ${page.responseTimeMs}ms to respond. Under 600ms is a good target for Time to First Byte.`,
      impact: "high",
      effort: "high",
    });
    score -= 25;
  } else if (page.responseTimeMs > 800) {
    findings.push({
      label: "Server response time is on the slow side",
      status: "warn",
      detail: `${page.responseTimeMs}ms response time.`,
      impact: "medium",
      effort: "high",
    });
    score -= 10;
  } else {
    findings.push({
      label: "Fast server response time",
      status: "pass",
      detail: `${page.responseTimeMs}ms.`,
      impact: "low",
    });
  }

  const pageSizeKb = Math.round(Buffer.byteLength(page.html, "utf8") / 1024);
  if (pageSizeKb > 500) {
    findings.push({
      label: "Large HTML document size",
      status: "warn",
      detail: `${pageSizeKb}KB of HTML. Large documents slow initial parse and render, especially on mobile.`,
      impact: "medium",
      effort: "medium",
    });
    score -= 10;
  }

  return {
    key: "technicalPerformance",
    label: "Technical Performance",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
    usedFallback: true,
  };
}
