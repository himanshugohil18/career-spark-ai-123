ALTER TABLE public.job_matches
  ADD COLUMN IF NOT EXISTS seniority_score integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS seniority_tier text NOT NULL DEFAULT 'match',
  ADD COLUMN IF NOT EXISTS required_years numeric;

CREATE TABLE IF NOT EXISTS public.job_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  preferred_roles text[] NOT NULL DEFAULT '{}',
  preferred_locations text[] NOT NULL DEFAULT '{}',
  preferred_countries text[] NOT NULL DEFAULT '{}',
  preferred_regions text[] NOT NULL DEFAULT '{}',
  work_modes text[] NOT NULL DEFAULT '{}',
  experience_levels text[] NOT NULL DEFAULT '{}',
  employment_types text[] NOT NULL DEFAULT '{}',
  salary_min numeric,
  salary_max numeric,
  salary_currency text NOT NULL DEFAULT 'INR',
  salary_period text NOT NULL DEFAULT 'year',
  willing_to_relocate boolean NOT NULL DEFAULT false,
  open_to_international boolean NOT NULL DEFAULT false,
  include_stretch boolean NOT NULL DEFAULT true,
  strict_salary_filter boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_preferences TO authenticated;
GRANT ALL ON public.job_preferences TO service_role;
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own job preferences" ON public.job_preferences;
CREATE POLICY "Users manage their own job preferences"
  ON public.job_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_job_preferences_updated_at ON public.job_preferences;
CREATE TRIGGER update_job_preferences_updated_at
  BEFORE UPDATE ON public.job_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();