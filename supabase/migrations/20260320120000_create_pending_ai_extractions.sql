-- Tabela para salvar extrações de IA pendentes (não perdidas ao fechar modal)
CREATE TABLE IF NOT EXISTS pending_ai_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    edital_name TEXT NOT NULL,
    origin TEXT,
    position TEXT,
    year TEXT,
    ai_result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_pending_per_user UNIQUE (user_id)
);

ALTER TABLE pending_ai_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pending extractions"
    ON pending_ai_extractions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_pending_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_ai_extractions_updated_at
    BEFORE UPDATE ON pending_ai_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_timestamp();
