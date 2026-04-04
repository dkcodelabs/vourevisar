-- Pending Merge Suggestions Table
-- Armazena sugestões de mesclagem geradas pela IA para revisão do usuário

CREATE TABLE IF NOT EXISTS public.pending_merge_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cycle_id UUID REFERENCES public.user_cycles(id) ON DELETE CASCADE,
    
    -- Tipo de sugestão: 'subject' ou 'topic'
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('subject', 'topic')),
    
    -- Nomes originais que a IA sugere unificar
    original_names JSONB NOT NULL,
    
    -- Nome sugerido pela IA para o grupo unificado
    suggested_name TEXT NOT NULL,
    
    -- Status: pending, approved, rejected
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Dados originais dos IDs (para correlação)
    original_ids JSONB,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pending_merge_user ON public.pending_merge_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_merge_cycle ON public.pending_merge_suggestions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_pending_merge_status ON public.pending_merge_suggestions(status);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pending_merge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_pending_merge_updated_at ON public.pending_merge_suggestions;
CREATE TRIGGER trigger_update_pending_merge_updated_at
    BEFORE UPDATE ON public.pending_merge_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_merge_updated_at();

COMMENT ON TABLE public.pending_merge_suggestions IS 'Sugestões de mesclagem geradas pela IAawait，等待用户审核';
COMMENT ON COLUMN public.pending_merge_suggestions.suggestion_type IS 'Tipo: subject ou topic';
COMMENT ON COLUMN public.pending_merge_suggestions.original_names IS 'Array de nomes originais a serem unificados';
COMMENT ON COLUMN public.pending_merge_suggestions.status IS 'pending=aguardo, approved=aprovado, rejected=rejeitado';
