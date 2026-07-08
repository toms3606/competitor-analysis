import { DimensionKey } from "./types";

/**
 * Weights determine each dimension's contribution to the overall 0–100
 * score. Weights sum to 1.0. These mirror the GEO Audit's 7-dimension
 * shape but score classic-SEO fundamentals instead of AI-crawler signals.
 *
 * Rationale for weighting:
 * - Crawlability is foundational — nothing else matters if the page can't
 *   be indexed at all, so it carries real weight but isn't the majority.
 * - On-Page and Structured Data are the two most actionable, highest-ROI
 *   fixes for most prospects, so they're weighted highest.
 * - Off-Site Authority is real but slowest to move and least within a
 *   single engagement's control, so it's weighted lowest.
 */
export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  crawlability: 0.15,
  technicalPerformance: 0.15,
  onPage: 0.2,
  siteArchitecture: 0.1,
  contentQuality: 0.15,
  structuredData: 0.15,
  offSiteAuthority: 0.1,
};

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  crawlability: "Crawlability & Indexation",
  technicalPerformance: "Technical Performance",
  onPage: "On-Page Optimization",
  siteArchitecture: "Site Architecture",
  contentQuality: "Content Quality & Depth",
  structuredData: "Structured Data",
  offSiteAuthority: "Off-Site Authority",
};

export const DIMENSION_ORDER: DimensionKey[] = [
  "crawlability",
  "technicalPerformance",
  "onPage",
  "siteArchitecture",
  "contentQuality",
  "structuredData",
  "offSiteAuthority",
];
