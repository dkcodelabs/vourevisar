-- Expose only authentication capabilities, never password hashes or identity
-- payloads. The self-service RPC is scoped to auth.uid(); the internal RPC is
-- callable exclusively with service_role by trusted Edge Functions.

CREATE OR REPLACE FUNCTION public.get_my_auth_methods()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'has_password', COALESCE(target.encrypted_password, '') <> '',
    'providers', COALESCE((
      SELECT jsonb_agg(DISTINCT identity.provider ORDER BY identity.provider)
      FROM auth.identities AS identity
      WHERE identity.user_id = target.id
    ), '[]'::jsonb)
  )
  FROM auth.users AS target
  WHERE target.id = (SELECT auth.uid())
$function$;

REVOKE ALL ON FUNCTION public.get_my_auth_methods() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_auth_methods() TO authenticated;

CREATE OR REPLACE FUNCTION public.internal_get_auth_methods(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  has_password boolean,
  providers text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    target.id,
    COALESCE(target.encrypted_password, '') <> '' AS has_password,
    COALESCE((
      SELECT array_agg(DISTINCT identity.provider ORDER BY identity.provider)
      FROM auth.identities AS identity
      WHERE identity.user_id = target.id
    ), ARRAY[]::text[]) AS providers
  FROM auth.users AS target
  WHERE p_user_id IS NULL OR target.id = p_user_id
$function$;

REVOKE ALL ON FUNCTION public.internal_get_auth_methods(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_get_auth_methods(uuid) TO service_role;

COMMENT ON FUNCTION public.get_my_auth_methods() IS
  'Returns only the current user authentication capabilities for account-security UI.';
COMMENT ON FUNCTION public.internal_get_auth_methods(uuid) IS
  'Returns authentication capabilities to trusted service-role Edge Functions only.';
