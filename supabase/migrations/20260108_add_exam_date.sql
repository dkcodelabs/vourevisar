-- Adiciona coluna para armazenar a data meta da prova do usuário
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS data_prova_meta DATE DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.user_settings.data_prova_meta IS 'Data da prova/concurso que o estudante está se preparando. Nullable pois nem todos terão edital definido.';
