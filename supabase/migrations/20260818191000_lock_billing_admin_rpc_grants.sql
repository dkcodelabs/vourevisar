-- Remove explicit API grants that may have survived older migrations.
REVOKE ALL ON FUNCTION public.reset_user_ai_quota(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.use_coupon(text, uuid) FROM anon, authenticated;
