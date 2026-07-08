# Competitor Audit — Phase 1: Core Comparison Engine

A genuine competitive analysis tool — brand vs. up to 3 named
competitors, structured comparison table plus a narrative SWOT
synthesis. Standalone repo, shares the same Neon project as GEO Audit
and SEO Audit (tables prefixed `comp_`).

## What makes this different from GEO/SEO Audit

Those two tools are mechanical scoring engines (7 dimensions, 0–100,
light AI assistance for vertical detection). This tool is closer to
**AI-driven qualitative synthesis with mechanical scoring underneath
it** — one Anthropic call reads the brand's site alongside every named
competitor's site *together*, so every judgment is genuinely relational
("how does this brand's positioning compare to these specific
competitors") rather than independent per-site summaries stitched
together after the fact.

## What's built in this phase

- **Mechanical SEO Visibility score** — reuses the SEO Audit tool's
  actual 7-dimension analyzer engine (copied into `lib/seo-engine/`,
  trimmed of SEO Audit-specific features like keyword evaluation and
  vertical detection, which don't apply here). Run once per site
  (brand + each competitor), giving a real, comparable 0–100 number.
- **Comparative AI analysis** (`lib/analyzers/comparative.ts`) — one
  Anthropic call, fed the brand's content plus all named competitors'
  content together, returns a structured comparison across 6
  dimensions:
  1. Positioning & Messaging
  2. Content Depth & Cadence
  3. AI Engine Visibility (judged via entity-signal clarity, since this
     call doesn't have live web access to test real AI engines the way
     GEO Audit's multi-engine prompt-testing does — see note below)
  4. Social Proof & Trust Signals
  5. Pricing Transparency
  6. Brand Voice Consistency

  Each dimension returns a brand assessment, a per-competitor
  assessment, and a relative `brandPosition` (ahead / even / behind).
- **SWOT synthesis** — same call also returns Strengths, Weaknesses,
  Opportunities, and Threats, grounded in the actual comparison rather
  than generic template language.
- **`POST /api/audit`**: takes `brandUrl` + `competitorUrls` (1–3,
  required upfront — this tool's whole premise is the comparison, unlike
  SEO Audit where competitor comparison is an optional follow-up step).
  Runs the SEO score and the comparative analysis, stores everything,
  returns the full result.
- **`GET /api/audit-data/[id]`**: fetches a stored result, with the
  white-label `branding` object attached, same pattern as the other
  two tools.
- **Postgres schema**: `comp_audits` + `comp_drip_jobs`. Note: there's
  already an unrelated `competitor_audits` table in the shared Neon
  project (backing GEO Audit's own compare feature) — `comp_audits` is
  deliberately a different name to avoid any collision or confusion.

## On "AI Engine Visibility" — an honest limitation

GEO Audit's AI-visibility testing works by sending real prompts to
actual AI engines (ChatGPT, Claude, Gemini) and checking whether a
domain gets mentioned — genuine signal, not a guess. This tool's
`aiVisibility` dimension is **not** that; it's a same-call judgment
based on how clearly each site establishes structured entity claims
(who they are, what they do, for whom), which correlates with AI
citability but isn't a direct test of it. Worth deciding whether to
upgrade this to genuine multi-engine prompt-testing (matching GEO's
approach) once we confirm what API access GEO Audit actually has
configured for that — this phase intentionally kept scope to a single
Anthropic call rather than guessing at API integrations we haven't
confirmed exist.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local`. Use the **same shared Neon
   connection string** as your other tools for `DATABASE_URL` — don't
   create a new project.
3. Run `migrations/001_init.sql` in that same Neon database. Only adds
   `comp_audits` and `comp_drip_jobs` — won't touch anything else.
4. `ANTHROPIC_API_KEY` is required for this tool to do anything
   meaningful — without it, the comparative analysis and SWOT are both
   omitted, leaving only the bare SEO score comparison.
5. `npm run build` locally before deploying, to catch any type errors
   the way SEO Audit's PDF route did — same discipline going forward.
6. Deploy to Vercel, update the API_BASE placeholders once you have the
   Vercel URL.

## Not yet built (next phases)

- Squarespace input page + results page (this phase was
  backend-first, matching how SEO Audit was built — scoring engine
  before UI).
- PDF report.
- Email pipeline / 30-day re-audit tracking.
- Deciding on the AI Engine Visibility upgrade path (see above).
