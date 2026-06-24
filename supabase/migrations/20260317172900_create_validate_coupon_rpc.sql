CREATE OR REPLACE FUNCTION validate_coupon(target_coupon_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    coupon_record RECORD;
BEGIN
    -- 1. Buscar o cupom
    SELECT * INTO coupon_record FROM coupons WHERE code = target_coupon_code AND active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Cupom inválido ou inativo');
    END IF;
    
    -- 2. Validar data de expiração
    IF coupon_record.valid_until IS NOT NULL AND coupon_record.valid_until < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Cupom expirado');
    END IF;
    
    -- 3. Validar limite de uso
    IF coupon_record.max_uses IS NOT NULL AND coupon_record.uses_count >= coupon_record.max_uses THEN
        RETURN json_build_object('success', false, 'error', 'Cupom esgotado');
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'coupon_id', coupon_record.id,
        'discount_type', coupon_record.discount_type, 
        'discount_value', coupon_record.discount_value
    );
END;
$$;;
