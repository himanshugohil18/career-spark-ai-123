
-- Remove any placeholder/demo jobs from prior devseed runs.
DELETE FROM public.jobs WHERE provider = 'devseed';

-- Seed real, zero-config and curated job providers so the discovery pipeline
-- returns real listings instead of falling back to fake data.
INSERT INTO public.job_sources (id, display_name, enabled, config) VALUES
  ('remoteok',    'RemoteOK',      true, '{}'::jsonb),
  ('ycombinator', 'Y Combinator',  true, '{}'::jsonb),
  ('wellfound',   'Wellfound',     true, '{}'::jsonb),
  ('indeed',      'Indeed',        true, '{}'::jsonb),
  ('linkedin',    'LinkedIn Jobs', true, '{}'::jsonb),
  ('naukri',      'Naukri',        true, '{}'::jsonb),
  ('instahyre',   'Instahyre',     true, '{}'::jsonb),
  ('hirist',      'Hirist',        true, '{}'::jsonb),
  ('cutshort',    'Cutshort',      true, '{}'::jsonb),
  ('greenhouse',  'Greenhouse',    true,
    '{"boards":["stripe","airbnb","notion","figma","vercel","openai","anthropic","cloudflare","gitlab","dropbox","asana","reddit","instacart","doordash","robinhood","brex","ramp","plaid","retool","linear","posthog","mongodb","confluent","datadog","hashicorp","snowflake","discord","grafanalabs","circleci","replicate","render","supabase","clerkinc","neondatabase","warpdotdev","modallabs"]}'::jsonb),
  ('lever',       'Lever',         true,
    '{"companies":["netflix","spotify","shopify","palantir","mercury","medium","huggingface","attio","ramp","attn","angellist","substack","robinhood","opendoor","doordash","segment","checkr","kickstarter"]}'::jsonb),
  ('ashby',       'Ashby',         true,
    '{"companies":["ramp","openai","linear","notion","posthog","runwayml","perplexity","attio","warp","vercel","modal","supabase","clerk","render","turso","browserbasehq","factoryai","cursor"]}'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      enabled = EXCLUDED.enabled,
      config = EXCLUDED.config,
      updated_at = now();
