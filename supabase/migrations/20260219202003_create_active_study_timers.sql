
-- Tabela de timers de estudo ativos — 1 linha por usuário ativo (PRIMARY KEY = user_id).
-- Garante atomicidade via UPSERT e sincronização cross-browser via Supabase Realtime.
CREATE TABLE IF NOT EXISTS public.active_study_timers (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id        UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'RUNNING'
                    CHECK (status IN ('RUNNING', 'PAUSED')),
    -- started_at: timestamp do início do trecho atual de tempo RUNNING.
    -- NULL quando pausado.
    started_at      TIMESTAMPTZ,
    -- accumulated_ms: milissegundos acumulados ANTES da sessão atual.
    -- O tempo total = accumulated_ms + (now() - started_at) quando RUNNING.
    accumulated_ms  BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_active_study_timer_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_active_study_timers_updated_at ON public.active_study_timers;
CREATE TRIGGER trg_active_study_timers_updated_at
    BEFORE UPDATE ON public.active_study_timers
    FOR EACH ROW EXECUTE FUNCTION public.set_active_study_timer_updated_at();

-- RLS: usuário só vê e altera o próprio registro
ALTER TABLE public.active_study_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprio timer"
    ON public.active_study_timers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere próprio timer"
    ON public.active_study_timers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza próprio timer"
    ON public.active_study_timers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprio timer"
    ON public.active_study_timers FOR DELETE
    USING (auth.uid() = user_id);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_study_timers;
;
