-- Add indice_atual field to track current position in cycle
ALTER TABLE public.user_cycles 
ADD COLUMN indice_atual integer DEFAULT 0;