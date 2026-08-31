-- Cover the remaining foreign keys reported by the performance advisor in
-- billing, affiliate, coupon and administrative state tables.
create index if not exists idx_billing_access_grants_granted_by on public.billing_access_grants (granted_by);
create index if not exists idx_billing_affiliate_conversions_subscription on public.billing_affiliate_conversions (billing_subscription_id);
create index if not exists idx_billing_affiliate_conversions_payout on public.billing_affiliate_conversions (payout_id);
create index if not exists idx_billing_affiliate_payouts_affiliate on public.billing_affiliate_payouts (affiliate_id);
create index if not exists idx_billing_affiliate_payouts_created_by on public.billing_affiliate_payouts (created_by);
create index if not exists idx_billing_affiliates_created_by on public.billing_affiliates (created_by);
create index if not exists idx_billing_refund_admin_actions_actor on public.billing_refund_admin_actions (actor_user_id);
create index if not exists idx_billing_refund_requests_subscription on public.billing_refund_requests (billing_subscription_id);
create index if not exists idx_coupon_uses_coupon_id on public.coupon_uses (coupon_id);
create index if not exists idx_coupon_uses_user_id on public.coupon_uses (user_id);
create index if not exists idx_edital_suggestions_user_id on public.edital_suggestions (user_id);
create index if not exists idx_pending_cycle_merges_edital_id on public.pending_cycle_merges (edital_id);
create index if not exists idx_pending_cycle_merges_user_id on public.pending_cycle_merges (user_id);
create index if not exists idx_user_ai_quota_resets_granted_by on public.user_ai_quota_resets (granted_by);
