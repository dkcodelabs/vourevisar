-- Coupons are independent from subscriptions. Remove the obsolete provider id
-- from the function signature and from the persistence path.
DROP FUNCTION IF EXISTS public.use_coupon(text, uuid, text);

CREATE FUNCTION public.use_coupon(target_coupon_code text, target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  coupon_record RECORD;
BEGIN
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = target_coupon_code
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cupom inválido ou inativo');
  END IF;

  IF coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < now() THEN
    RETURN json_build_object('success', false, 'error', 'Cupom expirado');
  END IF;

  IF coupon_record.max_uses IS NOT NULL AND coupon_record.uses_count >= coupon_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Cupom esgotado');
  END IF;

  INSERT INTO public.coupon_uses (coupon_id, user_id)
  VALUES (coupon_record.id, target_user_id);

  UPDATE public.coupons
  SET uses_count = uses_count + 1
  WHERE id = coupon_record.id;

  RETURN json_build_object(
    'success', true,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.use_coupon(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_coupon(text, uuid) TO authenticated, service_role;
