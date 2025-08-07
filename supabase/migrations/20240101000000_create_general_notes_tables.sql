-- Tabela para anotações gerais do usuário
CREATE TABLE general_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabela para lembretes gerais do usuário
CREATE TABLE general_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  reminder_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE general_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_reminders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para general_notes
CREATE POLICY "Users can view their own general notes" ON general_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own general notes" ON general_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own general notes" ON general_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own general notes" ON general_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas de segurança para general_reminders
CREATE POLICY "Users can view their own reminders" ON general_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON general_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON general_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON general_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX idx_general_notes_user_id ON general_notes(user_id);
CREATE INDEX idx_general_reminders_user_id ON general_reminders(user_id);
CREATE INDEX idx_general_reminders_date ON general_reminders(reminder_date);
CREATE INDEX idx_general_reminders_completed ON general_reminders(completed);