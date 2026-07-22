
-- Lock down SECURITY DEFINER functions: revoke default PUBLIC EXECUTE
-- and grant only to roles that actually need each function.

-- Trigger-only functions: no direct callers need EXECUTE.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_allowlisted_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_invoice_number() FROM PUBLIC, anon, authenticated;

-- has_role: used inside RLS policies. Keep callable by authenticated only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- get_active_plan: signed-in users check their own plan.
REVOKE ALL ON FUNCTION public.get_active_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_plan(uuid) TO authenticated;

-- ensure_default_job_collections: signed-in users seed their own collections.
REVOKE ALL ON FUNCTION public.ensure_default_job_collections(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_job_collections(uuid) TO authenticated;

-- get_public_stats: intentionally public homepage stats via publishable key.
REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
