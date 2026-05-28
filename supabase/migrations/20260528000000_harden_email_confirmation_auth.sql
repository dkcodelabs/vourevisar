-- Harden duplicate email checks so the app can distinguish an existing
-- unconfirmed password account from a confirmed account or OAuth account.
DROP FUNCTION IF EXISTS public.check_email_exists(text);

CREATE FUNCTION public.check_email_exists(email_to_check text)
RETURNS TABLE(email_exists boolean, provider_type text, email_confirmed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    true AS email_exists,
    CASE
      WHEN au.raw_user_meta_data->>'iss' = 'https://accounts.google.com'
        OR au.raw_app_meta_data->>'provider' = 'google'
        OR au.raw_app_meta_data->'providers' ? 'google'
      THEN 'Google'
      ELSE COALESCE(p.provider_type, 'Email')
    END AS provider_type,
    (au.email_confirmed_at IS NOT NULL OR au.confirmed_at IS NOT NULL) AS email_confirmed
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE lower(au.email) = lower(email_to_check)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unknown'::text, false;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;
