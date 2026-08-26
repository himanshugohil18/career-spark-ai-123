CREATE TABLE public.interview_sim_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'mixed',
  status TEXT NOT NULL DEFAULT 'active',
  planned_questions INTEGER NOT NULL DEFAULT 5,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  overall_score NUMERIC,
  feedback_summary TEXT,
  strengths TEXT[],
  improvements TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sim_sessions TO authenticated;
GRANT ALL ON public.interview_sim_sessions TO service_role;
ALTER TABLE public.interview_sim_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own interview sim sessions" ON public.interview_sim_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_interview_sim_sessions_updated_at BEFORE UPDATE ON public.interview_sim_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.interview_sim_turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sim_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  score NUMERIC,
  feedback TEXT,
  points_hit TEXT[],
  points_missed TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, turn_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sim_turns TO authenticated;
GRANT ALL ON public.interview_sim_turns TO service_role;
ALTER TABLE public.interview_sim_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own interview sim turns" ON public.interview_sim_turns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own learning progress" ON public.learning_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON public.learning_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_handle_key ON public.profiles (lower(public_handle)) WHERE public_handle IS NOT NULL;
GRANT SELECT ON public.profiles TO anon;
CREATE POLICY "Anyone can view shared public profiles" ON public.profiles FOR SELECT TO anon USING (is_public = true);