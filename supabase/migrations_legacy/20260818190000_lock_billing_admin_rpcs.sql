-- Billing/admin RPCs must never be callable from the public API.
-- They are invoked by trusted Edge Functions with the service role.
REVOKE ALL ON FUNCTION public.reset_user_ai_quota(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_user_ai_quota(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_ai_quota(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.use_coupon(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.use_coupon(text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_coupon(text, uuid) TO service_role;
