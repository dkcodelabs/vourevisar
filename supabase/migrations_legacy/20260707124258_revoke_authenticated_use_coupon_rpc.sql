-- Coupon consumption is performed by the asaas-checkout Edge Function with
-- service_role after validating the authenticated user. Browser clients should
-- only validate coupons, not consume them directly.
revoke all on function public.use_coupon(text, uuid, text) from authenticated;
