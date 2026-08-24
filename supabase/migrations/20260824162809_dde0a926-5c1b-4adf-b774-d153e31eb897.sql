-- Resume Studio: extend resume_versions into full resume documents
ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'ats_classic',
  ADD COLUMN IF NOT EXISTS section_order text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'optimized',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Application tracking statuses
DO $$
BEGIN
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'preparing'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'applied'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'assessment'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'interview'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'rejected'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'offer'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TYPE public.saved_job_status ADD VALUE IF NOT EXISTS 'closed'; EXCEPTION WHEN others THEN NULL; END;
END $$;

ALTER TABLE public.saved_jobs
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS resume_version_id uuid REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_letter_id uuid REFERENCES public.cover_letters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now();

-- Recruiter outreach messages
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  tone text NOT NULL DEFAULT 'professional',
  subject text,
  body text NOT NULL,
  recipient text,
  ai_model text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT ALL ON public.outreach_messages TO service_role;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own outreach" ON public.outreach_messages;
CREATE POLICY "own outreach" ON public.outreach_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grounded AI career chat
CREATE TABLE IF NOT EXISTS public.career_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  grounding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_chat_messages TO authenticated;
GRANT ALL ON public.career_chat_messages TO service_role;
ALTER TABLE public.career_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own chat" ON public.career_chat_messages;
CREATE POLICY "own chat" ON public.career_chat_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS career_chat_messages_user_created_idx ON public.career_chat_messages (user_id, created_at);
CREATE INDEX IF NOT EXISTS outreach_messages_user_created_idx ON public.outreach_messages (user_id, created_at DESC);