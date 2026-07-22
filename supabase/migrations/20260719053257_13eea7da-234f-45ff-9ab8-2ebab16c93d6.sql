
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'users',        (SELECT count(*) FROM public.profiles),
    'jobs',         (SELECT count(*) FROM public.jobs),
    'applications', (SELECT count(*) FROM public.application_workspaces),
    'ai_sessions',  (SELECT count(*) FROM public.ai_application_sessions),
    'resumes',      (SELECT count(*) FROM public.resume_versions),
    'companies',    (SELECT count(*) FROM public.companies)
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated, service_role;
