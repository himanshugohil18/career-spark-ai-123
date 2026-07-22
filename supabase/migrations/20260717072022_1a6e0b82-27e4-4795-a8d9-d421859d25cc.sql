
-- Phase 2.5 additive columns: confidence, provenance, review workflow
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS overall_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.career_brain
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS overall_confidence numeric,
  ADD COLUMN IF NOT EXISTS last_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completeness_score numeric;

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.work_experiences
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.education
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.languages
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_original jsonb,
  ADD COLUMN IF NOT EXISTS verified_fields text[] NOT NULL DEFAULT '{}';
