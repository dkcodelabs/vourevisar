-- Add unification_map JSONB column to user_cycles table
-- Stores the visual merge map when multiple editais are combined in a single study cycle.
-- This is a referential/visual-only mapping — original data remains in subjects/topics tables.

ALTER TABLE user_cycles 
ADD COLUMN IF NOT EXISTS unification_map JSONB DEFAULT NULL;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN user_cycles.unification_map IS 
  'Stores the CycleUnificationMap JSON when multiple editais are merged into a cycle. Contains visual mappings between equivalent subjects/topics without altering original data.';
