-- An affiliate earns the acquisition bounty only once per vouRevisar user in
-- project, even if the user creates another subscription or tries a different
-- code later. Test and Live use separate Supabase projects.
CREATE UNIQUE INDEX billing_affiliate_conversions_user_key
  ON public.billing_affiliate_conversions (user_id)
  WHERE user_id IS NOT NULL;
