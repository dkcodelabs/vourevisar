-- Add materias_estudadas_ciclo field to track studied subjects in current cycle
ALTER TABLE public.user_cycles 
ADD COLUMN materias_estudadas_ciclo text[] DEFAULT '{}';

-- Add comment to explain the field
COMMENT ON COLUMN public.user_cycles.materias_estudadas_ciclo IS 'Array of subject IDs that have been studied in the current cycle';