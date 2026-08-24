ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stale_reason TEXT;

UPDATE public.jobs SET last_verified_at = COALESCE(last_seen_at, created_at, now()) WHERE last_verified_at IS NULL OR last_verified_at < COALESCE(last_seen_at, created_at);

CREATE INDEX IF NOT EXISTS jobs_active_verified_idx ON public.jobs (is_active, last_verified_at DESC);
CREATE INDEX IF NOT EXISTS jobs_active_posted_idx ON public.jobs (is_active, posted_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.sweep_stale_jobs(_stale_days INTEGER DEFAULT 21)
RETURNS TABLE (expired_count INTEGER, stale_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expired INTEGER := 0;
  _stale INTEGER := 0;
BEGIN
  UPDATE public.jobs
     SET is_active = false, stale_reason = 'expired', updated_at = now()
   WHERE is_active = true
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS _expired = ROW_COUNT;

  UPDATE public.jobs
     SET is_active = false, stale_reason = 'unverified', updated_at = now()
   WHERE is_active = true
     AND last_verified_at < now() - make_interval(days => _stale_days);
  GET DIAGNOSTICS _stale = ROW_COUNT;

  RETURN QUERY SELECT _expired, _stale;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stale_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_stale_jobs(INTEGER) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('sweep-stale-jobs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('sweep-stale-jobs', '15 3 * * *', $$SELECT public.sweep_stale_jobs(21);$$);