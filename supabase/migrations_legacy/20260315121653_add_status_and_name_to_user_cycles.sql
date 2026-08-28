ALTER TABLE user_cycles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE user_cycles ADD COLUMN IF NOT EXISTS name text;

-- Adicionar constraint de check para status se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_cycles_status_check') THEN
        ALTER TABLE user_cycles ADD CONSTRAINT user_cycles_status_check CHECK (status IN ('active', 'completed', 'archived'));
    END IF;
END $$;

-- Atualizar registros existentes para status 'active' caso sejam null (embora o default já trate novos)
UPDATE user_cycles SET status = 'active' WHERE status IS NULL;;
