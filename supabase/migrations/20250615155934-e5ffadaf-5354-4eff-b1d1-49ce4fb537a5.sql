-- Adicionar campo materias_pendentes na tabela user_cycles
ALTER TABLE public.user_cycles 
ADD COLUMN materias_pendentes text[] DEFAULT '{}';

-- Comentário: Este campo armazenará IDs de matérias criadas durante um ciclo ativo
-- que devem ser incluídas apenas no próximo ciclo