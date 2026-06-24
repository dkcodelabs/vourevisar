
CREATE TABLE IF NOT EXISTS plan_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL CHECK (slug IN ('monthly', 'annual')),
    name TEXT NOT NULL,
    value NUMERIC NOT NULL CHECK (value >= 0),
    description TEXT NOT NULL DEFAULT '',
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage plan configs" ON plan_configs
    FOR ALL USING (
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Authenticated can view active plans" ON plan_configs
    FOR SELECT USING (active = true);

INSERT INTO plan_configs (slug, name, value, description, features, badge) VALUES
(
    'monthly',
    'Mensal',
    9.90,
    'Acesso completo sem fidelidade, cancele quando quiser.',
    '["Acesso Total", "Sem Fidelidade", "Suporte VIP", "7 Dias Grátis"]'::jsonb,
    NULL
),
(
    'annual',
    'Anual',
    99.90,
    'Acesso completo por 12 meses com economia.',
    '["Tudo do Mensal", "2 Meses Grátis", "Estatísticas Beta", "Suporte 24h", "7 Dias Grátis"]'::jsonb,
    'O Mais Vendido'
)
ON CONFLICT (slug) DO NOTHING;
;
