import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

/** Recursively pulls @type values out of a parsed JSON-LD object, which
 *  may be a single object, an array, or use @graph nesting. */
function extractTypes(node: any, out: Set<string>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => extractTypes(n, out));
    return;
  }
  if (node["@type"]) {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    types.forEach((t: string) => out.add(t));
  }
  if (node["@graph"]) extractTypes(node["@graph"], out);
}

export async function analyzeStructuredData(page: FetchedPage): Promise<DimensionResult> {
  const { $ } = page;
  const findings: Finding[] = [];
  let score = 100;

  const scripts = $('script[type="application/ld+json"]');
  const foundTypes = new Set<string>();
  let malformedCount = 0;

  scripts.each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      extractTypes(parsed, foundTypes);
    } catch {
      malformedCount++;
    }
  });

  if (scripts.length === 0) {
    findings.push({
      label: "No structured data found",
      status: "fail",
      detail: "No JSON-LD schema markup detected. Structured data is what enables rich results (star ratings, FAQs, breadcrumbs) in search listings.",
      impact: "high",
      effort: "medium",
    });
    score -= 40;
  } else {
    findings.push({
      label: "Structured data present",
      status: "pass",
      detail: `Found ${scripts.length} JSON-LD block(s) declaring: ${[...foundTypes].join(", ") || "no @type found"}.`,
      impact: "low",
    });
  }

  if (malformedCount > 0) {
    findings.push({
      label: "Malformed JSON-LD detected",
      status: "fail",
      detail: `${malformedCount} JSON-LD block(s) failed to parse as valid JSON. Search engines will silently ignore broken schema.`,
      impact: "high",
      effort: "low",
    });
    score -= 20;
  }

  // Check for the schema types most likely to matter for a business site
  const expectedTypes = ["Organization", "WebSite", "BreadcrumbList", "FAQPage", "Product", "Article"];
  const foundExpected = expectedTypes.filter((t) => foundTypes.has(t));

  if (scripts.length > 0 && foundExpected.length === 0) {
    findings.push({
      label: "No common business schema types found",
      status: "warn",
      detail: `Structured data exists but doesn't declare any of the common types (${expectedTypes.join(", ")}). Consider adding Organization or WebSite schema at minimum.`,
      impact: "medium",
      effort: "medium",
    });
    score -= 10;
  }

  if (!foundTypes.has("Organization") && !foundTypes.has("LocalBusiness")) {
    findings.push({
      label: "No Organization/LocalBusiness schema",
      status: "warn",
      detail: "Organization schema helps establish entity identity for the brand across search and AI systems, and is typically a homepage-level addition.",
      impact: "medium",
      effort: "low",
    });
    score -= 8;
  }

  return {
    key: "structuredData",
    label: "Structured Data",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
  };
}
