
-- =========================================================
-- Phase 3 — AI Job Discovery Platform
-- =========================================================

-- Reuse existing update_updated_at helper if present, otherwise create.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- Enums
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.remote_status AS ENUM ('remote', 'hybrid', 'onsite', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','internship','temporary','freelance','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.experience_level AS ENUM ('intern','entry','junior','mid','senior','staff','principal','lead','executive','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.saved_job_status AS ENUM ('saved','favorite','archived','ignored','applied_later');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.search_kind AS ENUM ('natural','filter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM ('new_high_match','saved_updated','salary_change','job_closed','remote_opportunity','application_reminder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- companies
-- =========================================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  logo_url TEXT,
  industry TEXT,
  size TEXT,
  remote_policy TEXT,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies readable by everyone" ON public.companies FOR SELECT USING (true);
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_companies_name ON public.companies (lower(name));

-- =========================================================
-- job_sources (provider registry)
-- =========================================================
CREATE TABLE public.job_sources (
  id TEXT NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_sources TO authenticated;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job sources readable by authenticated" ON public.job_sources FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_job_sources_updated_at BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.job_sources (id, display_name, enabled, config) VALUES
  ('greenhouse','Greenhouse', true, '{"boards": []}'::jsonb),
  ('lever','Lever', true, '{"companies": []}'::jsonb),
  ('ashby','Ashby', true, '{"companies": []}'::jsonb),
  ('workable','Workable', false, '{}'::jsonb),
  ('wellfound','Wellfound', false, '{}'::jsonb),
  ('remoteok','RemoteOK', true, '{}'::jsonb),
  ('ycombinator','Y Combinator', true, '{}'::jsonb),
  ('custom','Custom Company Pages', false, '{"pages": []}'::jsonb);

-- =========================================================
-- jobs
-- =========================================================
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  location TEXT,
  location_country TEXT,
  remote_status public.remote_status NOT NULL DEFAULT 'unknown',
  employment_type public.employment_type NOT NULL DEFAULT 'unknown',
  experience_level public.experience_level NOT NULL DEFAULT 'unknown',
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT,
  description TEXT,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  benefits TEXT[] NOT NULL DEFAULT '{}',
  application_url TEXT NOT NULL,
  provider TEXT NOT NULL REFERENCES public.job_sources(id),
  source_id TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  fingerprint TEXT NOT NULL,
  raw_payload JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, source_id)
);
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs readable by everyone" ON public.jobs FOR SELECT USING (true);
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_jobs_posted_at ON public.jobs (posted_at DESC NULLS LAST);
CREATE INDEX idx_jobs_active_posted ON public.jobs (is_active, posted_at DESC NULLS LAST);
CREATE INDEX idx_jobs_fingerprint ON public.jobs (fingerprint);
CREATE INDEX idx_jobs_required_skills ON public.jobs USING GIN (required_skills);
CREATE INDEX idx_jobs_company ON public.jobs (company_id);
CREATE INDEX idx_jobs_remote_status ON public.jobs (remote_status);

-- =========================================================
-- job_provider_ids (dedup mapping)
-- =========================================================
CREATE TABLE public.job_provider_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL REFERENCES public.job_sources(id),
  source_id TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, source_id)
);
GRANT SELECT ON public.job_provider_ids TO authenticated;
GRANT ALL ON public.job_provider_ids TO service_role;
ALTER TABLE public.job_provider_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider IDs readable by authenticated" ON public.job_provider_ids FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_job_provider_ids_job ON public.job_provider_ids (job_id);

-- =========================================================
-- job_matches (per-user AI matching)
-- =========================================================
CREATE TABLE public.job_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  skill_score NUMERIC NOT NULL DEFAULT 0,
  experience_score NUMERIC NOT NULL DEFAULT 0,
  education_score NUMERIC NOT NULL DEFAULT 0,
  technology_score NUMERIC NOT NULL DEFAULT 0,
  career_goal_score NUMERIC NOT NULL DEFAULT 0,
  location_score NUMERIC NOT NULL DEFAULT 0,
  salary_score NUMERIC NOT NULL DEFAULT 0,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  ai_model TEXT,
  brain_version INT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_matches TO authenticated;
GRANT ALL ON public.job_matches TO service_role;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own matches" ON public.job_matches
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_job_matches_updated_at BEFORE UPDATE ON public.job_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_job_matches_user_overall ON public.job_matches (user_id, overall_score DESC);
CREATE INDEX idx_job_matches_computed ON public.job_matches (computed_at DESC);

-- =========================================================
-- saved_jobs
-- =========================================================
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status public.saved_job_status NOT NULL DEFAULT 'saved',
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved jobs" ON public.saved_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_saved_jobs_updated_at BEFORE UPDATE ON public.saved_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_saved_jobs_user_status ON public.saved_jobs (user_id, status);

-- =========================================================
-- job_collections
-- =========================================================
CREATE TABLE public.job_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_collections TO authenticated;
GRANT ALL ON public.job_collections TO service_role;
ALTER TABLE public.job_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own collections" ON public.job_collections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_job_collections_updated_at BEFORE UPDATE ON public.job_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_job_collections_user ON public.job_collections (user_id);

CREATE TABLE public.job_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.job_collections(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_collection_items TO authenticated;
GRANT ALL ON public.job_collection_items TO service_role;
ALTER TABLE public.job_collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own collection items" ON public.job_collection_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_job_collection_items_collection ON public.job_collection_items (collection_id);

-- =========================================================
-- viewed_jobs
-- =========================================================
CREATE TABLE public.viewed_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viewed_jobs TO authenticated;
GRANT ALL ON public.viewed_jobs TO service_role;
ALTER TABLE public.viewed_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own viewed jobs" ON public.viewed_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_viewed_jobs_user_time ON public.viewed_jobs (user_id, viewed_at DESC);

-- =========================================================
-- search_history
-- =========================================================
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  parsed_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  kind public.search_kind NOT NULL DEFAULT 'natural',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own search history" ON public.search_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_search_history_user_time ON public.search_history (user_id, created_at DESC);

-- =========================================================
-- recommendation_history
-- =========================================================
CREATE TABLE public.recommendation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_history TO authenticated;
GRANT ALL ON public.recommendation_history TO service_role;
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recommendations" ON public.recommendation_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_recs_user_time ON public.recommendation_history (user_id, created_at DESC);

-- =========================================================
-- job_notifications
-- =========================================================
CREATE TABLE public.job_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_notifications TO authenticated;
GRANT ALL ON public.job_notifications TO service_role;
ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.job_notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_time ON public.job_notifications (user_id, created_at DESC);

-- =========================================================
-- Default collections helper (idempotent)
-- =========================================================
CREATE OR REPLACE FUNCTION public.ensure_default_job_collections(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.job_collections (user_id, name, description, is_default)
  SELECT _user_id, v.name, v.description, true
  FROM (VALUES
    ('Dream Companies','Companies you would love to work at'),
    ('Applied Later','Jobs to apply to later'),
    ('Remote','Remote opportunities'),
    ('High Salary','Well-compensated roles'),
    ('Favorites','Your favorite roles')
  ) AS v(name, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.job_collections c
    WHERE c.user_id = _user_id AND c.name = v.name AND c.is_default = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_job_collections(UUID) TO authenticated;
