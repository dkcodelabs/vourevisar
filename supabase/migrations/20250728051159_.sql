-- Primeiro, vamos verificar se o trigger está causando problemas
-- Vou remover o trigger problemático e recriar corretamente

-- Remover o trigger que está causando erro
DROP TRIGGER IF EXISTS update_user_cycles_updated_at ON user_cycles;

-- Criar novo trigger que usa o campo correto (atualizado_em)
CREATE OR REPLACE FUNCTION update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o novo trigger à tabela user_cycles
CREATE TRIGGER update_user_cycles_atualizado_em
    BEFORE UPDATE ON user_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em_column();;
