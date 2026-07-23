UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email IS NOT NULL
  AND (p.email IS DISTINCT FROM u.email);