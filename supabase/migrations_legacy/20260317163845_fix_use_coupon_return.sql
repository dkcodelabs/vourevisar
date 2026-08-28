CREATE OR REPLACE FUNCTION use_coupon(target_coupon_code TEXT, target_user_id UUID, target_sub_id TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    coupon_record RECORD;
    result JSON;
BEGIN
    -- 1. Buscar o cupom
    SELECT * INTO coupon_record FROM coupons WHERE code = target_coupon_code AND active = true FOR UPDATE;
    
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
    
    -- 4. Inserir uso do cupom (se falhar pela constraint UNIQUE, significa que o usuário já usou)
    BEGIN
        INSERT INTO coupon_uses (coupon_id, user_id, asaas_subscription_id)
        VALUES (coupon_record.id, target_user_id, target_sub_id);
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Você já utilizou este cupom');
    END;
    
    -- 5. Incrementar o contador de uso
    UPDATE coupons SET uses_count = uses_count + 1 WHERE id = coupon_record.id;
    
    RETURN json_build_object(
        'success', true, 
        'coupon_id', coupon_record.id,
        'discount_type', coupon_record.discount_type, 
        'discount_value', coupon_record.discount_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
