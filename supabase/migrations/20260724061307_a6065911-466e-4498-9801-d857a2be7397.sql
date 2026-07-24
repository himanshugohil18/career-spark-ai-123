
-- Restrict job_sources and job_provider_ids reads to admins (server uses service_role, bypasses RLS)
DROP POLICY IF EXISTS "Job sources readable by authenticated" ON public.job_sources;
CREATE POLICY "Admins can read job sources" ON public.job_sources
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Provider IDs readable by authenticated" ON public.job_provider_ids;
CREATE POLICY "Admins can read provider ids" ON public.job_provider_ids
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Explicit deny of client writes to email_logs (service_role bypasses RLS and continues to write).
CREATE POLICY "No client inserts to email logs" ON public.email_logs
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates to email logs" ON public.email_logs
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes to email logs" ON public.email_logs
  FOR DELETE TO authenticated, anon USING (false);

-- Lock down SECURITY DEFINER function EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_active_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_default_job_collections(uuid) FROM PUBLIC, anon;

-- Re-grant only what the app truly needs.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_job_collections(uuid) TO authenticated;
