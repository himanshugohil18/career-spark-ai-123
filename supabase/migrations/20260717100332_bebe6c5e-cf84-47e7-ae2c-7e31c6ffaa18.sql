
-- Application Workspaces
CREATE TABLE public.application_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  career_brain_version INTEGER,
  resume_version INTEGER,
  match_id UUID REFERENCES public.job_matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'created',
  current_stage TEXT NOT NULL DEFAULT 'workspace_created',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  readiness_score INTEGER,
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_workspaces TO authenticated;
GRANT ALL ON public.application_workspaces TO service_role;
ALTER TABLE public.application_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workspaces" ON public.application_workspaces
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_app_ws_user ON public.application_workspaces(user_id, last_opened_at DESC);

-- Timeline
CREATE TABLE public.application_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stage TEXT,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_timeline TO authenticated;
GRANT ALL ON public.application_timeline TO service_role;
ALTER TABLE public.application_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own timeline" ON public.application_timeline
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_app_timeline_ws ON public.application_timeline(workspace_id, created_at DESC);

-- Job Description Intelligence + Resume Analysis (Application Analysis)
CREATE TABLE public.application_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_intelligence JSONB,
  resume_analysis JSONB,
  ai_model TEXT,
  input_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_analysis TO authenticated;
GRANT ALL ON public.application_analysis TO service_role;
ALTER TABLE public.application_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analysis" ON public.application_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Company Intelligence cache (shared per company)
CREATE TABLE public.company_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  overview TEXT,
  industry TEXT,
  size TEXT,
  engineering_culture TEXT,
  products TEXT[],
  tech_stack TEXT[],
  remote_policy TEXT,
  hiring_style TEXT,
  values TEXT[],
  funding_stage TEXT,
  headquarters TEXT,
  website TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_model TEXT,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_intelligence TO authenticated;
GRANT ALL ON public.company_intelligence TO service_role;
ALTER TABLE public.company_intelligence ENABLE ROW LEVEL SECURITY;
-- Company info is derived from public job data; any authenticated user may read the cache.
CREATE POLICY "read company intel" ON public.company_intelligence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "write company intel" ON public.company_intelligence
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update company intel" ON public.company_intelligence
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ATS Analysis
CREATE TABLE public.ats_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  keyword_coverage INTEGER,
  keyword_density NUMERIC,
  formatting_score INTEGER,
  missing_keywords TEXT[],
  matched_keywords TEXT[],
  required_skills_coverage INTEGER,
  preferred_skills_coverage INTEGER,
  technology_coverage INTEGER,
  section_completeness JSONB,
  suggestions JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ats_analysis TO authenticated;
GRANT ALL ON public.ats_analysis TO service_role;
ALTER TABLE public.ats_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ats" ON public.ats_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Gap Analysis
CREATE TABLE public.gap_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mastered_skills JSONB,
  partial_skills JSONB,
  missing_skills JSONB,
  high_priority JSONB,
  recommended_next JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gap_analysis TO authenticated;
GRANT ALL ON public.gap_analysis TO service_role;
ALTER TABLE public.gap_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gap" ON public.gap_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Application Readiness
CREATE TABLE public.application_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  resume_quality INTEGER,
  ats_compatibility INTEGER,
  skill_match INTEGER,
  technology_match INTEGER,
  project_match INTEGER,
  experience_match INTEGER,
  brain_alignment INTEGER,
  company_alignment INTEGER,
  competitiveness TEXT,
  strengths JSONB,
  weaknesses JSONB,
  top_improvements JSONB,
  recommendations JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_readiness TO authenticated;
GRANT ALL ON public.application_readiness TO service_role;
ALTER TABLE public.application_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own readiness" ON public.application_readiness
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Application Notes
CREATE TABLE public.application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  remind_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes" ON public.application_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_app_notes_ws ON public.application_notes(workspace_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER trg_app_ws_updated BEFORE UPDATE ON public.application_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_app_analysis_updated BEFORE UPDATE ON public.application_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_company_intel_updated BEFORE UPDATE ON public.company_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ats_updated BEFORE UPDATE ON public.ats_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_gap_updated BEFORE UPDATE ON public.gap_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_readiness_updated BEFORE UPDATE ON public.application_readiness
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_app_notes_updated BEFORE UPDATE ON public.application_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
