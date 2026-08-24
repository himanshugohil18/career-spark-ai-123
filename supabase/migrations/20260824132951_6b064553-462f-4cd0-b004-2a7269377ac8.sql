-- Provider reliability tiers + health telemetry on job_sources
ALTER TABLE public.job_sources
  ADD COLUMN IF NOT EXISTS tier smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'search_page_parse',
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_fetched_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verified_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_ms integer,
  ADD COLUMN IF NOT EXISTS disabled_reason text;

ALTER TABLE public.job_sources
  DROP CONSTRAINT IF EXISTS job_sources_tier_check;
ALTER TABLE public.job_sources
  ADD CONSTRAINT job_sources_tier_check CHECK (tier IN (1,2,3));

-- Tier 1: official company ATS + company career feeds
UPDATE public.job_sources SET tier = 1, source_type = 'company_ats'
  WHERE id IN ('greenhouse','lever','ashby','workable');
UPDATE public.job_sources SET tier = 1, source_type = 'official_api'
  WHERE id IN ('ycombinator');
UPDATE public.job_sources SET tier = 1, source_type = 'company_careers'
  WHERE id IN ('custom');

-- Tier 2: documented public APIs / feeds
UPDATE public.job_sources SET tier = 2, source_type = 'official_api'
  WHERE id IN ('remoteok','remotive','arbeitnow','jobicy','himalayas');
UPDATE public.job_sources SET tier = 2, source_type = 'public_feed'
  WHERE id IN ('weworkremotely','indeed');

-- Tier 3: unofficial endpoints / search-page parsing
UPDATE public.job_sources SET tier = 3, source_type = 'unofficial_endpoint'
  WHERE id IN ('linkedin');
UPDATE public.job_sources SET tier = 3, source_type = 'search_page_parse'
  WHERE id IN ('naukri','instahyre','hirist','cutshort','wellfound','foundit','shine',
               'timesjobs','simplyhired','glassdoor','internshala','talent','ziprecruiter',
               'dice','builtin','remoteco','remoteleads','levelsfyi','flexjobs','upwork');

-- Seed health from the last crawl so tiering starts from reality:
-- providers that fetched rows are healthy, zero-yield providers are unhealthy.
UPDATE public.job_sources
SET last_attempt_at = last_run_at,
    last_fetched_count = COALESCE((config->'lastDiscovery'->>'fetched')::int, 0),
    last_success_at = CASE WHEN COALESCE((config->'lastDiscovery'->>'fetched')::int, 0) > 0
                           THEN last_run_at ELSE NULL END,
    health_status = CASE WHEN COALESCE((config->'lastDiscovery'->>'fetched')::int, 0) > 0
                         THEN 'healthy' ELSE 'unhealthy' END,
    consecutive_failures = CASE WHEN COALESCE((config->'lastDiscovery'->>'fetched')::int, 0) > 0
                                THEN 0 ELSE 6 END;

-- Disable Tier 3 providers that produce nothing: anti-bot walls / JS-only pages.
UPDATE public.job_sources
SET enabled = false,
    health_status = 'unhealthy',
    disabled_reason = 'Zero usable results: anti-bot protected or JS-only search page. Not a permitted or stable source.'
WHERE tier = 3
  AND COALESCE((config->'lastDiscovery'->>'fetched')::int, 0) = 0;

-- Stale-handling guarantee: a provider that is currently unhealthy must not have
-- its old jobs presented as freshly verified. Re-align any verification stamp
-- that runs ahead of the last real sighting.
UPDATE public.jobs j
SET last_verified_at = j.last_seen_at
WHERE j.last_verified_at > j.last_seen_at;