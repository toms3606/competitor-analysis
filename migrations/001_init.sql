-- Competitor Audit — initial schema
-- Shares the same Neon project as your other tools. Tables are
-- prefixed `comp_` to stay unique within the shared database — note
-- there is already an unrelated `competitor_audits` table in this
-- project (backing GEO Audit's own compare-against-competitors
-- feature); `comp_audits` is intentionally a different name to avoid
-- any confusion or collision with that existing table.

CREATE TABLE IF NOT EXISTS comp_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_url TEXT NOT NULL,
  competitor_urls JSONB NOT NULL,   -- array of up to 3 competitor URLs
  result JSONB NOT NULL,             -- full comparison payload: seoScores + comparative (dimensions + SWOT)
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_audits_created_at ON comp_audits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_audits_brand_url ON comp_audits (brand_url);

-- Same drip/re-audit scheduling shape as the other tools, ready for
-- when the email pipeline phase happens across all three tools together.
CREATE TABLE IF NOT EXISTS comp_drip_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES comp_audits (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  job_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_drip_jobs_scheduled ON comp_drip_jobs (scheduled_for) WHERE sent_at IS NULL;
