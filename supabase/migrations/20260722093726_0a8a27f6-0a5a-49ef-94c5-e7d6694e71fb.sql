-- Grant admin now
INSERT INTO public.user_roles (user_id, role)
VALUES ('2a3fde51-0dbc-4f93-a505-889183d02ff6', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update allowlist trigger to include the new address
CREATE OR REPLACE FUNCTION public.grant_admin_for_allowlisted_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) IN (
    'himanshugohil828@gmail.com',
    'himnashugohil828@gmail.com',
    'riyaadesaii04@gmail.com',
    'himanshugohil4444@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;