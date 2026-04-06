-- ================================================
-- TRIGGERS PARA CONSISTÊNCIA DE MESCLAGENS
-- Execute este SQL no Supabase (SQL Editor)
-- ================================================

-- 1. Trigger: Ao deletar matéria, remove merges relacionados
CREATE OR REPLACE FUNCTION cleanup_subject_merges_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover topic_merges relacionados aos subject_merges da matéria
    DELETE FROM topic_merges 
    WHERE subject_merge_id IN (
        SELECT id FROM subject_merges 
        WHERE primary_subject_id = OLD.id 
           OR merged_subject_ids @> JSONB_BUILD_ARRAY(OLD.id)
    );
    
    -- Remover subject_merges da matéria
    DELETE FROM subject_merges 
    WHERE primary_subject_id = OLD.id 
       OR merged_subject_ids @> JSONB_BUILD_ARRAY(OLD.id);
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_subject_merges ON subjects;
CREATE TRIGGER trigger_cleanup_subject_merges
AFTER DELETE ON subjects
FOR EACH ROW
EXECUTE FUNCTION cleanup_subject_merges_on_delete();

-- 2. Trigger: Ao deletar edital, limpa pending_cycle_merges e subject_merges/topic_merges relacionados
CREATE OR REPLACE FUNCTION cleanup_merges_on_edital_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Pegar IDs das matérias do edital deletado
    -- Limpar pending_cycle_merges
    DELETE FROM pending_cycle_merges 
    WHERE edital_id = OLD.id;
    
    -- Remover subject_merges cujas matérias pertenciam a este edital
    -- Primeiro pegar as matérias do edital
    DELETE FROM topic_merges 
    WHERE subject_merge_id IN (
        SELECT sm.id FROM subject_merges sm
        JOIN subjects s ON s.id = sm.primary_subject_id
        WHERE s.edital_id = OLD.id
    );
    
    DELETE FROM subject_merges 
    WHERE primary_subject_id IN (
        SELECT id FROM subjects WHERE edital_id = OLD.id
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_merges_on_edital ON user_editais;
CREATE TRIGGER trigger_cleanup_merges_on_edital
AFTER DELETE ON user_editais
FOR EACH ROW
EXECUTE FUNCTION cleanup_merges_on_edital_delete();

-- 3. Trigger: Ao limpar ciclo_atual (remover matéria), limpa merges relacionados
CREATE OR REPLACE FUNCTION sync_merges_on_cycle_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover subject_merges que não têm mais nenhum ID no ciclo_atual
    DELETE FROM topic_merges tm
    WHERE tm.subject_merge_id IN (
        SELECT sm.id FROM subject_merges sm
        WHERE NOT EXISTS (
            SELECT 1 FROM JSONB_ARRAY_ELEMENTS_TEXT(
                COALESCE(sm.merged_subject_ids::jsonb, '[]'::jsonb)
                || JSONB_BUILD_ARRAY(sm.primary_subject_id)
            ) elem
            WHERE elem = ANY(NEW.ciclo_atual)
        )
    );
    
    DELETE FROM subject_merges sm
    WHERE NOT EXISTS (
        SELECT 1 FROM JSONB_ARRAY_ELEMENTS_TEXT(
            COALESCE(sm.merged_subject_ids::jsonb, '[]'::jsonb)
            || JSONB_BUILD_ARRAY(sm.primary_subject_id)
        ) elem
        WHERE elem = ANY(NEW.ciclo_atual)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_merges_on_cycle ON user_cycles;
CREATE TRIGGER trigger_sync_merges_on_cycle
AFTER UPDATE ON user_cycles
FOR EACH ROW
WHEN (OLD.ciclo_atual IS DISTINCT FROM NEW.ciclo_atual)
EXECUTE FUNCTION sync_merges_on_cycle_update();

-- ================================================
-- LIMPEZA DE DADOS EXISTENTES PROBLEMÁTICOS
-- ================================================

-- Limpar todos os pending_cycle_merges órfãos (editais que não existem mais)
DELETE FROM pending_cycle_merges pcm
WHERE NOT EXISTS (
    SELECT 1 FROM user_editais ue 
    WHERE ue.id = pcm.edital_id
);

-- Limpar subject_merges órfãos (matérias que não existem mais)
DELETE FROM subject_merges sm
WHERE NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.id = sm.primary_subject_id
);

-- Limpar topic_merges órfãos (tópicos que não existem mais)  
DELETE FROM topic_merges tm
WHERE NOT EXISTS (
    SELECT 1 FROM topics t 
    WHERE t.id = tm.primary_topic_id
);

-- Verificar o resultado
SELECT 'subject_merges' as tabela, COUNT(*) as total FROM subject_merges
UNION ALL
SELECT 'topic_merges', COUNT(*) FROM topic_merges
UNION ALL
SELECT 'pending_cycle_merges', COUNT(*) FROM pending_cycle_merges;
