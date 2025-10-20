-- Migration: Criar tabela study_sessions para tracking de sessões de estudo
-- Data: 2024-12-10
-- Objetivo: Implementar sistema "Estudo do Dia" com analytics

-- 1. Criar tabela study_sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  
  -- Dados temporais
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  
  -- Contexto do estudo
  cycle_position INTEGER, -- posição no ciclo (#1, #2, #3)
  topics_studied TEXT[] DEFAULT '{}', -- IDs dos tópicos estudados
  topics_count INTEGER DEFAULT 0,
  
  -- Dados comportamentais para analytics
  hour_of_day INTEGER NOT NULL, -- 0-23 (para análise de padrões)
  day_of_week INTEGER NOT NULL, -- 1-7 (segunda=1, domingo=7)
  is_weekend BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Qualidade percebida (futuro - opcional)
  focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date 
  ON study_sessions(user_id, study_date DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_hour 
  ON study_sessions(user_id, hour_of_day);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_subject 
  ON study_sessions(user_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_completed_at 
  ON study_sessions(user_id, completed_at DESC);

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sessions_updated_at();

-- 4. RLS (Row Level Security)
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem suas próprias sessões
CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Política: usuários só podem inserir suas próprias sessões
CREATE POLICY "Users can insert own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: usuários só podem atualizar suas próprias sessões
CREATE POLICY "Users can update own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: usuários só podem deletar suas próprias sessões
CREATE POLICY "Users can delete own study sessions" ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

  Página Estatísticas Completa:
  Dashboard com Insights:
  Análises Avançadas (Futuro):
  A Preditiva: