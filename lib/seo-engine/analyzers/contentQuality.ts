import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

export async function analyzeContentQuality(page: FetchedPage): Promise<DimensionResult> {
  const { $ } = page;
  const findings: Finding[] = [];
  let score = 100;

  // Strip nav/footer/script/style before counting words, so boilerplate
  // doesn't inflate the count for otherwise-thin pages.
  const $body = $("body").clone();
  $body.find("nav, footer, script, style, header, aside").remove();
  const text = $body.text().replace(/\s+/g, " ").trim();
  const wordCount = text.length ? text.split(" ").length : 0;

  if (wordCount < 300) {
    findings.push({
      label: "Thin content",
      status: "fail",
      detail: `Approximately ${wordCount} words of body content after removing navigation and boilerplate. Pages under ~300 words rarely rank for competitive terms.`,
      impact: "high",
      effort: "high",
    });
    score -= 30;
  } else if (wordCount < 600) {
    findings.push({
      label: "Content is on the light side",
      status: "warn",
      detail: `Approximately ${wordCount} words. Adequate for some page types (product pages, contact pages) but thin for anything meant to rank on informational intent.`,
      impact: "medium",
      effort: "high",
    });
    score -= 10;
  } else {
    findings.push({
      label: "Content depth is healthy",
      status: "pass",
      detail: `Approximately ${wordCount} words of body content.`,
      impact: "low",
    });
  }

  // Freshness signal: look for a modified-date meta tag or <time> element
  const modifiedMeta =
    $('meta[property="article:modified_time"]').attr("content") ||
    $('meta[name="last-modified"]').attr("content") ||
    $("time[datetime]").first().attr("datetime");

  if (!modifiedMeta) {
    findings.push({
      label: "No freshness signal found",
      status: "warn",
      detail: "No article:modified_time meta tag or <time> element found. Freshness signals help both users and search engines gauge whether content is current.",
      impact: "low",
      effort: "low",
    });
    score -= 5;
  } else {
    const modifiedDate = new Date(modifiedMeta);
    const ageInDays = Number.isNaN(modifiedDate.getTime())
      ? null
      : Math.round((Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (ageInDays !== null && ageInDays > 730) {
      findings.push({
        label: "Content hasn't been updated in over two years",
        status: "warn",
        detail: `Last modified ${ageInDays} days ago. For topics where currency matters, stale content can lose ground to more recently updated competitors.`,
        impact: "medium",
        effort: "medium",
      });
      score -= 8;
    } else {
      findings.push({
        label: "Freshness signal present",
        status: "pass",
        detail: ageInDays !== null ? `Last modified ${ageInDays} days ago.` : `Modified date found: ${modifiedMeta}.`,
        impact: "low",
      });
    }
  }

  return {
    key: "contentQuality",
    label: "Content Quality & Depth",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
  };
}
