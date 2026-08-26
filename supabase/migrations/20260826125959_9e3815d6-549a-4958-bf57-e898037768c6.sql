ALTER TABLE public.interview_sim_sessions
  ADD COLUMN IF NOT EXISTS interview_type text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS target_company text,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS current_difficulty text NOT NULL DEFAULT 'medium';

ALTER TABLE public.interview_sim_turns
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS focus_area text,
  ADD COLUMN IF NOT EXISTS hint text,
  ADD COLUMN IF NOT EXISTS model_answer text;