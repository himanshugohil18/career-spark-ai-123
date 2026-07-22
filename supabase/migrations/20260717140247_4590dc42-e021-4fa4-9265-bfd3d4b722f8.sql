INSERT INTO public.job_sources (id, display_name, enabled, config)
VALUES
  ('linkedin', 'LinkedIn Jobs', true, '{}'::jsonb),
  ('naukri', 'Naukri', true, '{}'::jsonb),
  ('instahyre', 'Instahyre', true, '{}'::jsonb),
  ('hirist', 'Hirist', true, '{}'::jsonb),
  ('cutshort', 'Cutshort', true, '{}'::jsonb),
  ('indeed', 'Indeed', true, '{}'::jsonb),
  ('wellfound', 'Wellfound', true, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  enabled = true,
  updated_at = now();