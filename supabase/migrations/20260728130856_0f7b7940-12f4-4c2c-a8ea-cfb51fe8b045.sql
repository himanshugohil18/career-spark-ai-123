INSERT INTO public.job_sources (id, display_name, enabled, config) VALUES
  ('remotive','Remotive',true,'{}'::jsonb),
  ('arbeitnow','Arbeitnow',true,'{}'::jsonb),
  ('jobicy','Jobicy',true,'{}'::jsonb),
  ('himalayas','Himalayas',true,'{}'::jsonb),
  ('weworkremotely','We Work Remotely',true,'{}'::jsonb),
  ('foundit','Foundit (Monster)',true,'{}'::jsonb),
  ('shine','Shine',true,'{}'::jsonb),
  ('timesjobs','TimesJobs',true,'{}'::jsonb),
  ('simplyhired','SimplyHired',true,'{}'::jsonb),
  ('glassdoor','Glassdoor',true,'{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET enabled = true, display_name = EXCLUDED.display_name;