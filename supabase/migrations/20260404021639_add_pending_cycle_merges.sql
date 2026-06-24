CREATE TABLE IF NOT EXISTS public.pending_cycle_merges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    edital_id UUID REFERENCES public.user_editais(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pending_cycle_merges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own pending merges"
ON public.pending_cycle_merges
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pending_cycle_merges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pending_cycle_merges_updated_at
    BEFORE UPDATE ON public.pending_cycle_merges
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_cycle_merges_updated_at();;
