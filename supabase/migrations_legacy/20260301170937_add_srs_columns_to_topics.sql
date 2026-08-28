ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS memory_stability real DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS current_interval real DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS retention_score real DEFAULT 0.0;
;
