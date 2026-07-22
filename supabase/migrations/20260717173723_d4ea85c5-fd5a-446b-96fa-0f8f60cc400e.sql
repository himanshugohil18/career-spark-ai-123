
-- ============ 1. Roles ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Seed initial admin (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'himnashugohil828@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ 2. Extend notification_kind for generic in-app notifications ============
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'ai_generation_complete';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'ai_generation_failed';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'auto_apply_complete';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'auto_apply_failed';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'auto_apply_needs_approval';
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'system';

-- Add deep-link column for notifications
ALTER TABLE public.job_notifications
  ADD COLUMN IF NOT EXISTS link text;

-- Index for unread lookup
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.job_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ============ 3. Tighten company_intelligence write policy ============
DROP POLICY IF EXISTS "write company intel" ON public.company_intelligence;
CREATE POLICY "write company intel" ON public.company_intelligence
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.application_workspaces w
      WHERE w.user_id = auth.uid()
        AND w.company_id = company_intelligence.company_id
    )
  );
