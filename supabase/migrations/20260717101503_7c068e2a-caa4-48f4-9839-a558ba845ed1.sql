-- =========================================================
-- Phase 4 Part 2 — AI Application Assistant
-- =========================================================

-- ENUMs -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.cover_letter_style AS ENUM
    ('professional','executive','concise','enthusiastic','startup','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.screening_question_kind AS ENUM
    ('about_you','why_company','why_hire','challenge','achievement','goals',
     'why_leaving','strengths','weaknesses','custom_short','custom_paragraph',
     'custom_essay','portfolio','project','technical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_question_category AS ENUM
    ('technical','behavioral','hr','project','resume','scenario','company','system_design','cloud_devops','coding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interview_question_difficulty AS ENUM ('easy','medium','hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.generation_kind AS ENUM
    ('resume_optimization','cover_letter','screening_answer','interview_session','application_package','custom_question');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) resume_versions ---------------------------------------
CREATE TABLE IF NOT EXISTS public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.application_workspaces(id) ON DELETE SET NULL,
  base_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  career_brain_version INTEGER,
  version_name TEXT NOT NULL,
  target_company TEXT,
  target_job_title TEXT,
  generation_reason TEXT,
  optimized_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  ats_score INTEGER,
  readiness_score INTEGER,
  keywords_added TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  ai_model TEXT,
  input_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resume_versions_user_idx ON public.resume_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS resume_versions_workspace_idx ON public.resume_versions(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_versions TO authenticated;
GRANT ALL ON public.resume_versions TO service_role;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resume_versions" ON public.resume_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_resume_versions_updated_at BEFORE UPDATE ON public.resume_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) cover_letters -----------------------------------------
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  resume_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  style public.cover_letter_style NOT NULL DEFAULT 'professional',
  greeting TEXT,
  body TEXT NOT NULL,
  closing TEXT,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  tone_notes TEXT,
  ai_model TEXT,
  input_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cover_letters_workspace_idx ON public.cover_letters(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cover_letters TO authenticated;
GRANT ALL ON public.cover_letters TO service_role;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cover_letters" ON public.cover_letters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cover_letters_updated_at BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) screening_answers -------------------------------------
CREATE TABLE IF NOT EXISTS public.screening_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind public.screening_question_kind NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  edited BOOLEAN NOT NULL DEFAULT false,
  ai_model TEXT,
  input_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS screening_answers_workspace_idx ON public.screening_answers(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_answers TO authenticated;
GRANT ALL ON public.screening_answers TO service_role;
ALTER TABLE public.screening_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own screening_answers" ON public.screening_answers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_screening_answers_updated_at BEFORE UPDATE ON public.screening_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) interview_sessions ------------------------------------
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  focus TEXT,
  ai_model TEXT,
  input_hash TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_sessions_workspace_idx ON public.interview_sessions(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interview_sessions" ON public.interview_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_interview_sessions_updated_at BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) interview_questions -----------------------------------
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  category public.interview_question_category NOT NULL,
  difficulty public.interview_question_difficulty NOT NULL DEFAULT 'medium',
  question TEXT NOT NULL,
  suggested_answer TEXT,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] NOT NULL DEFAULT '{}',
  confidence_tips TEXT[] NOT NULL DEFAULT '{}',
  follow_ups TEXT[] NOT NULL DEFAULT '{}',
  user_notes TEXT,
  practiced BOOLEAN NOT NULL DEFAULT false,
  ordering INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_questions_session_idx ON public.interview_questions(session_id, ordering);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_questions TO authenticated;
GRANT ALL ON public.interview_questions TO service_role;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interview_questions" ON public.interview_questions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_interview_questions_updated_at BEFORE UPDATE ON public.interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) application_packages ----------------------------------
CREATE TABLE IF NOT EXISTS public.application_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  resume_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  cover_letter_id UUID REFERENCES public.cover_letters(id) ON DELETE SET NULL,
  interview_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  screening_answer_ids UUID[] NOT NULL DEFAULT '{}',
  readiness_score INTEGER,
  ats_score INTEGER,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_packages_workspace_idx ON public.application_packages(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_packages TO authenticated;
GRANT ALL ON public.application_packages TO service_role;
ALTER TABLE public.application_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application_packages" ON public.application_packages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_application_packages_updated_at BEFORE UPDATE ON public.application_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) ai_generation_history ---------------------------------
CREATE TABLE IF NOT EXISTS public.ai_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  kind public.generation_kind NOT NULL,
  target_id UUID,
  ai_model TEXT,
  input_hash TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded',
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_generation_history_user_idx ON public.ai_generation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_history_workspace_idx ON public.ai_generation_history(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_history TO authenticated;
GRANT ALL ON public.ai_generation_history TO service_role;
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai_generation_history" ON public.ai_generation_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
