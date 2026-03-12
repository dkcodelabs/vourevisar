CREATE TABLE public_editais (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organ text NOT NULL,
    position text NOT NULL,
    status text NOT NULL,
    year text NOT NULL,
    category text NOT NULL,
    subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public_editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de editais públicos para todos os usuários"
    ON public_editais FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Escrita de editais públicos apenas para admins"
    ON public_editais FOR ALL
    TO authenticated
    USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

NOTIFY pgrst, 'reload schema';
