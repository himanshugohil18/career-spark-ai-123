CREATE TABLE public.career_roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Career Roadmap',
  present_role TEXT,
  target_role TEXT NOT NULL,
  target_location TEXT,
  target_salary TEXT,
  target_companies TEXT[],
  target_timeline TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  progress NUMERIC NOT NULL DEFAULT 0,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_roadmaps TO authenticated;
GRANT ALL ON public.career_roadmaps TO service_role;
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own roadmaps" ON public.career_roadmaps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER career_roadmaps_set_updated_at BEFORE UPDATE ON public.career_roadmaps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.career_roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL DEFAULT 1,
  phase_label TEXT,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL DEFAULT 'skill',
  status TEXT NOT NULL DEFAULT 'not_started',
  sort_order INTEGER NOT NULL DEFAULT 0,
  skills TEXT[],
  linked_project_id UUID,
  linked_job_id UUID,
  linked_learning_topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_roadmap_items TO authenticated;
GRANT ALL ON public.career_roadmap_items TO service_role;
ALTER TABLE public.career_roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own roadmap items" ON public.career_roadmap_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_roadmap_items_roadmap_idx ON public.career_roadmap_items(roadmap_id, phase, sort_order);
CREATE TRIGGER career_roadmap_items_set_updated_at BEFORE UPDATE ON public.career_roadmap_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.project_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id UUID REFERENCES public.career_roadmaps(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  description TEXT,
  why_recommended TEXT,
  architecture_overview TEXT,
  skills_covered TEXT[],
  tech_stack TEXT[],
  learning_goals TEXT[],
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested',
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_recommendations TO authenticated;
GRANT ALL ON public.project_recommendations TO service_role;
ALTER TABLE public.project_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own project recommendations" ON public.project_recommendations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER project_recommendations_set_updated_at BEFORE UPDATE ON public.project_recommendations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.career_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'action',
  target_count INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_date, title)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_missions TO authenticated;
GRANT ALL ON public.career_missions TO service_role;
ALTER TABLE public.career_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own missions" ON public.career_missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_missions_user_date_idx ON public.career_missions(user_id, mission_date);
CREATE TRIGGER career_missions_set_updated_at BEFORE UPDATE ON public.career_missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  job_matches BOOLEAN NOT NULL DEFAULT true,
  follow_ups BOOLEAN NOT NULL DEFAULT true,
  skill_gaps BOOLEAN NOT NULL DEFAULT true,
  interview_reminders BOOLEAN NOT NULL DEFAULT true,
  roadmap_progress BOOLEAN NOT NULL DEFAULT true,
  career_insights BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notification preferences" ON public.notification_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notification_preferences_set_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();