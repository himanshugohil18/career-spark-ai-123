
-- 1. Sessions
CREATE TABLE public.ai_application_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.application_workspaces(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  resume_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  cover_letter_id UUID REFERENCES public.cover_letters(id) ON DELETE SET NULL,
  browser_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  approval_required_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_application_sessions TO authenticated;
GRANT ALL ON public.ai_application_sessions TO service_role;
ALTER TABLE public.ai_application_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.ai_application_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_sess_user_idx ON public.ai_application_sessions(user_id, created_at DESC);
CREATE INDEX ai_sess_workspace_idx ON public.ai_application_sessions(workspace_id);
CREATE INDEX ai_sess_status_idx ON public.ai_application_sessions(user_id, status);
CREATE TRIGGER trg_ai_sess_updated BEFORE UPDATE ON public.ai_application_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Events / timeline / logs
CREATE TABLE public.ai_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_application_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT,
  kind TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_session_events TO authenticated;
GRANT ALL ON public.ai_session_events TO service_role;
ALTER TABLE public.ai_session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.ai_session_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_ev_sess_idx ON public.ai_session_events(session_id, created_at);

-- 3. Screenshots
CREATE TABLE public.ai_session_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_application_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_session_screenshots TO authenticated;
GRANT ALL ON public.ai_session_screenshots TO service_role;
ALTER TABLE public.ai_session_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shots" ON public.ai_session_screenshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_shot_sess_idx ON public.ai_session_screenshots(session_id, created_at);

-- 4. Answers (reusable across sessions)
CREATE TABLE public.ai_session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_application_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT,
  confidence NUMERIC,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_session_answers TO authenticated;
GRANT ALL ON public.ai_session_answers TO service_role;
ALTER TABLE public.ai_session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.ai_session_answers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_ans_sess_idx ON public.ai_session_answers(session_id);
CREATE INDEX ai_ans_user_idx ON public.ai_session_answers(user_id);

-- 5. Form fields
CREATE TABLE public.ai_session_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_application_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  selector TEXT,
  kind TEXT,
  value TEXT,
  filled BOOLEAN NOT NULL DEFAULT false,
  needs_user BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_session_fields TO authenticated;
GRANT ALL ON public.ai_session_fields TO service_role;
ALTER TABLE public.ai_session_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fields" ON public.ai_session_fields
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_field_sess_idx ON public.ai_session_fields(session_id);
CREATE TRIGGER trg_ai_field_updated BEFORE UPDATE ON public.ai_session_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime for live activity center
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_application_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_session_events;
