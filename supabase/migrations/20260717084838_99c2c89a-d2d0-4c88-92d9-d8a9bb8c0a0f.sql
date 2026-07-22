
CREATE OR REPLACE FUNCTION public.ensure_default_job_collections(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.job_collections (user_id, name, description, is_default)
  SELECT _user_id, v.name, v.description, true
  FROM (VALUES
    ('Dream Companies','Companies you would love to work at'),
    ('Applied Later','Jobs to apply to later'),
    ('Remote','Remote opportunities'),
    ('High Salary','Well-compensated roles'),
    ('Favorites','Your favorite roles')
  ) AS v(name, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.job_collections c
    WHERE c.user_id = _user_id AND c.name = v.name AND c.is_default = true
  );
END;
$$;
