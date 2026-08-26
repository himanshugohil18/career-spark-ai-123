CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view allowlist" ON public.admin_allowlist;
CREATE POLICY "Admins can view allowlist" ON public.admin_allowlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_allowlist (email) VALUES
  ('himanshugohil828@gmail.com'),
  ('himnashugohil828@gmail.com'),
  ('himanshugohil4444@gmail.com'),
  ('himanshu.gohil.in1@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Grant admin to any already-registered allowlisted account
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
JOIN public.admin_allowlist a ON lower(a.email) = lower(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

-- Self-service sync so allowlisted accounts created later become admins on first visit
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = v_email) INTO v_allowed;
  IF v_allowed THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_admin_role() FROM public;
GRANT EXECUTE ON FUNCTION public.sync_admin_role() TO authenticated;

-- Admin action audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);