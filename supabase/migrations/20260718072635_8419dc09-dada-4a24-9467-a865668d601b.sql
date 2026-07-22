INSERT INTO public.job_sources (id, display_name, enabled, config) VALUES
  ('greenhouse',  'Greenhouse',           true,  '{"boards": []}'::jsonb),
  ('lever',       'Lever',                true,  '{"companies": []}'::jsonb),
  ('ashby',       'Ashby',                true,  '{"companies": []}'::jsonb),
  ('workable',    'Workable',             false, '{}'::jsonb),
  ('wellfound',   'Wellfound',            true,  '{}'::jsonb),
  ('remoteok',    'RemoteOK',             true,  '{}'::jsonb),
  ('ycombinator', 'Y Combinator',         true,  '{}'::jsonb),
  ('custom',      'Custom Company Pages', false, '{"pages": []}'::jsonb),
  ('linkedin',    'LinkedIn Jobs',        true,  '{}'::jsonb),
  ('indeed',      'Indeed',               true,  '{}'::jsonb),
  ('naukri',      'Naukri',               true,  '{}'::jsonb),
  ('instahyre',   'Instahyre',            true,  '{}'::jsonb),
  ('hirist',      'Hirist',               true,  '{}'::jsonb),
  ('cutshort',    'Cutshort',             true,  '{}'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      enabled      = EXCLUDED.enabled;