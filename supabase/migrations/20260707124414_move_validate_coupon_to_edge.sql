-- Coupon validation now goes through billing-rpc Edge Function. The browser no
-- longer needs direct EXECUTE on this SECURITY DEFINER function.
revoke all on function public.validate_coupon(text) from authenticated;
