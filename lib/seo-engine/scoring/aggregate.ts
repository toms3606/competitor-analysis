import { AuditResult, DimensionResult, Finding, FindingImpact, FindingEffort } from "./types";
import { DIMENSION_WEIGHTS } from "./dimensions";

const IMPACT_RANK: Record<FindingImpact, number> = { high: 3, medium: 2, low: 1 };
const EFFORT_RANK: Record<FindingEffort, number> = { low: 3, medium: 2, high: 1 }; // low effort ranks highest

/**
 * Combines per-dimension results into a single weighted overall score
 * (0–100) and surfaces the top 3 "quick wins" — findings that are both
 * high-impact AND low-effort. This is a trimmed copy of the SEO Audit
 * tool's aggregator, reused here purely as the mechanical "SEO
 * Visibility" sub-score inside Competitor Audit — no keyword/vertical
 * fields, since those are specific to the standalone SEO Audit tool.
 */
export function aggregateAudit(url: string, dimensions: DimensionResult[]): AuditResult {
  const overallScore = Math.round(
    dimensions.reduce((sum, d) => {
      const weight = DIMENSION_WEIGHTS[d.key] ?? 0;
      return sum + d.score * weight;
    }, 0)
  );

  const allFailsAndWarns: Finding[] = dimensions
    .flatMap((d) => d.findings)
    .filter((f) => f.status !== "pass");

  const topFixes = [...allFailsAndWarns]
    .sort((a, b) => {
      const aScore = IMPACT_RANK[a.impact] * EFFORT_RANK[a.effort ?? "medium"];
      const bScore = IMPACT_RANK[b.impact] * EFFORT_RANK[b.effort ?? "medium"];
      return bScore - aScore;
    })
    .slice(0, 3);

  return { url, auditedAt: new Date().toISOString(), overallScore, dimensions, topFixes };
}
