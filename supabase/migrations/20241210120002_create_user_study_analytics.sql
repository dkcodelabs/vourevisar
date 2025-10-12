-- Migration: Criar tabela user_study_analytics para insights comportamentais
-- Data: 2024-12-10
-- Objetivo: Armazenar análises e padrões de estudo dos usuários

-- 1. Criar tabela user_study_analytics
CREATE TABLE IF NOT EXISTS user_study_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Padrões temporais
  melhor_horario_inicio TIME,
  melhor_horario_fim TIME,
  media_sessoes_por_dia DECIMAL(4,2) DEFAULT 0,
  media_duracao_sessao INTEGER DEFAULT 0, -- em minutos
  
  -- Padrões semanais (arrays de inteiros)
  dias_mais_produtivos INTEGER[] DEFAULT '{}', -- [1,2,3] = seg,ter,qua
  horarios_pico INTEGER[] DEFAULT '{}', -- [9,10,14,15] = 9h-10h, 14h-15h
  
  -- Métricas de consistência
  streak_atual INTEGER DEFAULT 0,
  maior_streak INTEGER DEFAULT 0,
  total_sessoes INTEGER DEFAULT 0,
  total_horas_estudadas DECIMAL(6,2) DEFAULT 0,
  
  -- Padrões por matéria (JSON para flexibilidade)
  materias_favoritas JSONB DEFAULT '{}', -- {"matematica": {"sessoes": 10, "media_topicos": 3.5}}
  produtividade_por_horario JSONB DEFAULT '{}', -- {"9": 4.2, "14": 3.8} (média de tópicos por hora)
  
  -- Insights calculados
  melhor_dia_semana INTEGER, -- 1-7
  pior_dia_semana INTEGER, -- 1-7
  horario_mais_produtivo INTEGER, -- 0-23
  
  -- Metadados
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_study_analytics_user_id 
  ON user_study_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_user_study_analytics_calculado_em 
  ON user_study_analytics(calculado_em DESC);

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_study_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_study_analytics_updated_at
  BEFORE UPDATE ON user_study_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_user_study_analytics_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE user_study_analytics ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem seus próprios analytics
CREATE POLICY "Users can view own analytics" ON user_study_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Política: usuários podem inserir/atualizar seus próprios analytics
CREATE POLICY "Users can manage own analytics" ON user_study_analytics
  FOR ALL USING (auth.uid() = user_id);

-- 5. Função para calcular analytics de um usuário
CREATE OR REPLACE FUNCTION calculate_user_analytics(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_total_sessoes INTEGER;
  v_total_horas DECIMAL(6,2);
  v_media_sessoes DECIMAL(4,2);
  v_media_duracao INTEGER;
  v_melhor_horario INTEGER;
  v_melhor_dia INTEGER;
  v_pior_dia INTEGER;
  v_streak_atual INTEGER;
  v_maior_streak INTEGER;
  v_horarios_pico INTEGER[];
  v_dias_produtivos INTEGER[];
BEGIN
  -- Calcular métricas básicas dos últimos 90 dias
  SELECT 
    COUNT(*),
    COALESCE(SUM(duration_minutes), 0) / 60.0,
    COUNT(*)::DECIMAL / GREATEST(1, (CURRENT_DATE - MIN(study_date) + 1)),
    COALESCE(AVG(duration_minutes), 0)::INTEGER
  INTO v_total_sessoes, v_total_horas, v_media_sessoes, v_media_duracao
  FROM study_sessions 
  WHERE user_id = p_user_id 
    AND study_date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- Encontrar melhor horário (mais sessões)
  SELECT hour_of_day
  INTO v_melhor_horario
  FROM study_sessions 
  WHERE user_id = p_user_id 
    AND study_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY hour_of_day
  ORDER BY COUNT(*) DESC, AVG(topics_count) DESC
  LIMIT 1;
  
  -- Encontrar melhor e pior dia da semana
  WITH dias_stats AS (
    SELECT 
      day_of_week,
      COUNT(*) as sessoes,
      AVG(topics_count) as produtividade
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY day_of_week
  )
  SELECT 
    (SELECT day_of_week FROM dias_stats ORDER BY produtividade DESC LIMIT 1),
    (SELECT day_of_week FROM dias_stats ORDER BY produtividade ASC LIMIT 1)
  INTO v_melhor_dia, v_pior_dia;
  
  -- Calcular horários de pico (top 3)
  SELECT array_agg(hour_of_day ORDER BY sessoes DESC)
  INTO v_horarios_pico
  FROM (
    SELECT hour_of_day, COUNT(*) as sessoes
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY hour_of_day
    ORDER BY sessoes DESC
    LIMIT 3
  ) t;
  
  -- Calcular dias mais produtivos (top 3)
  SELECT array_agg(day_of_week ORDER BY produtividade DESC)
  INTO v_dias_produtivos
  FROM (
    SELECT day_of_week, AVG(topics_count) as produtividade
    FROM study_sessions 
    WHERE user_id = p_user_id 
      AND study_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY day_of_week
    ORDER BY produtividade DESC
    LIMIT 3
  ) t;
  
  -- Buscar streak atual do user_cycles
  SELECT streak_dias_consecutivos
  INTO v_streak_atual
  FROM user_cycles
  WHERE user_id = p_user_id;
  
  -- Calcular maior streak histórico (simplificado)
  v_maior_streak := GREATEST(v_streak_atual, 
    COALESCE((SELECT MAX(streak_dias_consecutivos) FROM user_cycles WHERE user_id = p_user_id), 0)
  );
  
  -- Inserir ou atualizar analytics
  INSERT INTO user_study_analytics (
    user_id,
    total_sessoes,
    total_horas_estudadas,
    media_sessoes_por_dia,
    media_duracao_sessao,
    horario_mais_produtivo,
    melhor_dia_semana,
    pior_dia_semana,
    streak_atual,
    maior_streak,
    horarios_pico,
    dias_mais_produtivos,
    calculado_em
  ) VALUES (
    p_user_id,
    v_total_sessoes,
    v_total_horas,
    v_media_sessoes,
    v_media_duracao,
    v_melhor_horario,
    v_melhor_dia,
    v_pior_dia,
    v_streak_atual,
    v_maior_streak,
    v_horarios_pico,
    v_dias_produtivos,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_sessoes = EXCLUDED.total_sessoes,
    total_horas_estudadas = EXCLUDED.total_horas_estudadas,
    media_sessoes_por_dia = EXCLUDED.media_sessoes_por_dia,
    media_duracao_sessao = EXCLUDED.media_duracao_sessao,
    horario_mais_produtivo = EXCLUDED.horario_mais_produtivo,
    melhor_dia_semana = EXCLUDED.melhor_dia_semana,
    pior_dia_semana = EXCLUDED.pior_dia_semana,
    streak_atual = EXCLUDED.streak_atual,
    maior_streak = EXCLUDED.maior_streak,
    horarios_pico = EXCLUDED.horarios_pico,
    dias_mais_produtivos = EXCLUDED.dias_mais_produtivos,
    calculado_em = EXCLUDED.calculado_em,
    updated_at = NOW();
    
END;
$$ LANGUAGE plpgsql;