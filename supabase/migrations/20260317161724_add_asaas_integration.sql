-- 1. Adicionar campos do Asaas na tabela user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('PIX', 'CREDIT_CARD', 'BOLETO'));

-- 2. Criar tabela de cupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS para cupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar cupons
DROP POLICY IF EXISTS "Admins can manage all coupons" ON coupons;
CREATE POLICY "Admins can manage all coupons" ON coupons
    FOR ALL USING (
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- Qualquer usuário logado pode ler cupons ativos para validação
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
CREATE POLICY "Anyone can view active coupons" ON coupons
    FOR SELECT USING (active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- 3. Criar tabela de uso de cupons (coupon_uses)
CREATE TABLE IF NOT EXISTS coupon_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    asaas_subscription_id TEXT,
    UNIQUE(coupon_id, user_id)
);

-- Ativar RLS para coupon_uses
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

-- Admins podem ver/gerenciar tudo
DROP POLICY IF EXISTS "Admins can manage coupon uses" ON coupon_uses;
CREATE POLICY "Admins can manage coupon uses" ON coupon_uses
    FOR ALL USING (
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- Usuários podem ver apenas os seus usos de cupom
DROP POLICY IF EXISTS "Users can view own coupon uses" ON coupon_uses;
CREATE POLICY "Users can view own coupon uses" ON coupon_uses
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Função para registrar o uso de um cupom de forma segura
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
        'discount_type', coupon_record.discount_type, 
        'discount_value', coupon_record.discount_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
