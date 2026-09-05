CREATE TABLE IF NOT EXISTS public.automation_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.automation_config TO service_role;
ALTER TABLE public.automation_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.automation_config (key, value)
VALUES ('cron_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Nightly job discovery crawl (keeps postings current)
SELECT cron.unschedule('careeros-discover-jobs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'careeros-discover-jobs');
SELECT cron.schedule(
  'careeros-discover-jobs',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4c862a93-1fb0-491e-8ffe-1bfd363f7f37.lovable.app/api/public/hooks/discover-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.automation_config WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- Nightly match refresh so scores follow the freshly crawled jobs
SELECT cron.unschedule('careeros-refresh-matches') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'careeros-refresh-matches');
SELECT cron.schedule(
  'careeros-refresh-matches',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4c862a93-1fb0-491e-8ffe-1bfd363f7f37.lovable.app/api/public/hooks/refresh-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.automation_config WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);