export type FindingStatus = "pass" | "warn" | "fail";
export type FindingImpact = "high" | "medium" | "low";
export type FindingEffort = "low" | "medium" | "high";

export interface Finding {
  label: string;
  status: FindingStatus;
  detail: string;
  impact: FindingImpact;
  /** How much work the fix actually takes. Used to rank Quick Wins —
   *  high impact + low effort surfaces first. Optional on older findings
   *  for backward compatibility; treated as "medium" if absent. */
  effort?: FindingEffort;
}

export interface DimensionResult {
  key: DimensionKey;
  label: string;
  score: number; // 0–100, already normalized for this dimension
  maxScore: 100;
  findings: Finding[];
  /** True if this dimension fell back to a heuristic because an optional
   *  third-party API key was not configured. Surfaced on the results page
   *  so a client understands why a score might be an estimate. */
  usedFallback?: boolean;
}

export type DimensionKey =
  | "crawlability"
  | "technicalPerformance"
  | "onPage"
  | "siteArchitecture"
  | "contentQuality"
  | "structuredData"
  | "offSiteAuthority";

export interface AuditResult {
  url: string;
  auditedAt: string;
  overallScore: number; // 0–100 weighted
  dimensions: DimensionResult[];
  topFixes: Finding[]; // top 3 findings ranked by impact-to-effort
}
