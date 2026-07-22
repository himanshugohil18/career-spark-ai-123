-- Clean up debug row and slim the Greenhouse board list so a single
-- discovery run finishes inside the Cloudflare Worker budget.
DELETE FROM public.jobs WHERE source_id = 'debug-source-1';

UPDATE public.job_sources
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{boards}',
  '["stripe","airbnb","notion","figma","vercel","openai","anthropic","cloudflare","gitlab","dropbox","reddit","instacart","doordash","brex","ramp","plaid","retool","linear","posthog","datadog","hashicorp","snowflake","discord","supabase","render"]'::jsonb
)
WHERE id = 'greenhouse';