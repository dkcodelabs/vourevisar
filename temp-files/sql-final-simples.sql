-- SQL 1: Criar tabela study_sessions (versão simplificada)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  cycle_position INTEGER,
  topics_studied TEXT[] DEFAULT '{}',
  topics_count INTEGER DEFAULT 0,
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_weekend BOOLEAN NOT NULL DEFAULT FALSE,
  focus_rating INTEGER,
  difficulty_rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, study_date DESC);
CREATE INDEX idx_study_sessions_user_hour ON study_sessions(user_id, hour_of_day);
CREATE INDEX idx_study_sessions_user_subject ON study_sessions(user_id, subject_id);

---

-- SQL 2: Atualizar user_cycles
ALTER TABLE user_cycles 
ADD COLUMN materias_por_dia INTEGER DEFAULT 2,
ADD COLUMN materias_estudadas_hoje TEXT[] DEFAULT '{}',
ADD COLUMN data_ultimo_reset DATE DEFAULT CURRENT_DATE,
ADD COLUMN streak_dias_consecutivos INTEGER DEFAULT 0;

---

-- SQL 3: Criar user_study_analytics (versão simplificada)
CREATE TABLE user_study_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  melhor_horario_inicio TIME,
  melhor_horario_fim TIME,
  media_sessoes_por_dia DECIMAL(4,2) DEFAULT 0,
  media_duracao_sessao INTEGER DEFAULT 0,
  dias_mais_produtivos INTEGER[] DEFAULT '{}',
  horarios_pico INTEGER[] DEFAULT '{}',
  streak_atual INTEGER DEFAULT 0,
  maior_streak INTEGER DEFAULT 0,
  total_sessoes INTEGER DEFAULT 0,
  total_horas_estudadas DECIMAL(6,2) DEFAULT 0,
  melhor_dia_semana INTEGER,
  pior_dia_semana INTEGER,
  horario_mais_produtivo INTEGER,
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_study_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analytics" ON user_study_analytics
  FOR ALL USING (auth.uid() = user_id);