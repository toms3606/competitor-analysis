import { FetchedPage } from "../../fetchPage";
import { DimensionResult, Finding } from "../scoring/types";

export async function analyzeOnPage(page: FetchedPage): Promise<DimensionResult> {
  const { $ } = page;
  const findings: Finding[] = [];
  let score = 100;

  // Title tag
  const title = $("title").first().text().trim();
  if (!title) {
    findings.push({
      label: "Missing title tag",
      status: "fail",
      detail: "No <title> tag found. This is one of the strongest on-page ranking signals available.",
      impact: "high",
      effort: "low",
    });
    score -= 20;
  } else if (title.length < 15 || title.length > 65) {
    findings.push({
      label: "Title tag length is off-target",
      status: "warn",
      detail: `Title is ${title.length} characters ("${title}"). The sweet spot is roughly 15–65 characters so it doesn't get truncated in search results.`,
      impact: "medium",
      effort: "low",
    });
    score -= 8;
  } else {
    findings.push({
      label: "Title tag is well-formed",
      status: "pass",
      detail: `"${title}" (${title.length} characters).`,
      impact: "low",
    });
  }

  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!metaDesc) {
    findings.push({
      label: "Missing meta description",
      status: "fail",
      detail: "No meta description found. Search engines will generate a snippet automatically, which you don't control.",
      impact: "high",
      effort: "low",
    });
    score -= 15;
  } else if (metaDesc.length < 70 || metaDesc.length > 165) {
    findings.push({
      label: "Meta description length is off-target",
      status: "warn",
      detail: `Description is ${metaDesc.length} characters. The sweet spot is roughly 70–165 characters.`,
      impact: "medium",
      effort: "low",
    });
    score -= 6;
  } else {
    findings.push({
      label: "Meta description is well-formed",
      status: "pass",
      detail: `${metaDesc.length} characters.`,
      impact: "low",
    });
  }

  // H1 count
  const h1s = $("h1");
  if (h1s.length === 0) {
    findings.push({
      label: "No H1 found",
      status: "fail",
      detail: "Every page should have exactly one H1 that states what the page is about.",
      impact: "high",
      effort: "low",
    });
    score -= 15;
  } else if (h1s.length > 1) {
    findings.push({
      label: "Multiple H1 tags found",
      status: "warn",
      detail: `Found ${h1s.length} H1 tags. Multiple H1s dilute the page's primary-topic signal.`,
      impact: "medium",
      effort: "low",
    });
    score -= 6;
  } else {
    findings.push({
      label: "Single H1 present",
      status: "pass",
      detail: `"${h1s.first().text().trim()}"`,
      impact: "low",
    });
  }

  // Header hierarchy sanity check (H2 exists if H3s exist, etc. — basic check)
  const hasH2 = $("h2").length > 0;
  const hasH3 = $("h3").length > 0;
  if (hasH3 && !hasH2) {
    findings.push({
      label: "Header hierarchy skips a level",
      status: "warn",
      detail: "H3 tags exist without any H2 tags. Skipping heading levels can confuse both users and search engines about content structure.",
      impact: "low",
      effort: "medium",
    });
    score -= 4;
  }

  // Image alt text coverage
  const images = $("img");
  const totalImages = images.length;
  let missingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || alt.trim() === "") missingAlt++;
  });
  if (totalImages > 0) {
    const coverage = ((totalImages - missingAlt) / totalImages) * 100;
    if (coverage < 100) {
      findings.push({
        label: "Images missing alt text",
        status: coverage < 50 ? "fail" : "warn",
        detail: `${missingAlt} of ${totalImages} images (${Math.round(100 - coverage)}%) are missing alt text.`,
        impact: coverage < 50 ? "high" : "medium",
        effort: "low",
      });
      score -= coverage < 50 ? 15 : 8;
    } else {
      findings.push({
        label: "All images have alt text",
        status: "pass",
        detail: `${totalImages} images, all with alt attributes.`,
        impact: "low",
      });
    }
  }

  return {
    key: "onPage",
    label: "On-Page Optimization",
    score: Math.max(0, Math.min(100, score)),
    maxScore: 100,
    findings,
  };
}
