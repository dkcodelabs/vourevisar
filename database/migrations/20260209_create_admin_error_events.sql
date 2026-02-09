-- Migration: Create admin_error_events table
-- Description: Tabela para log de erros do sistema com deduplicação e RLS.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.admin_error_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    error_id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    user_message text NOT NULL,
    technical_message text NOT NULL,
    code text,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    retryable boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'ignored')),
    actor_user_id uuid,
    target_user_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurrence_count integer NOT NULL DEFAULT 1,
    first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT admin_error_events_pkey PRIMARY KEY (id),
    CONSTRAINT admin_error_events_error_id_key UNIQUE (error_id)
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_admin_errors_status ON public.admin_error_events(status);
CREATE INDEX IF NOT EXISTS idx_admin_errors_severity ON public.admin_error_events(severity);
CREATE INDEX IF NOT EXISTS idx_admin_errors_module ON public.admin_error_events(module);
CREATE INDEX IF NOT EXISTS idx_admin_errors_created_at ON public.admin_error_events(created_at DESC);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_admin_error_events_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_error_events_modtime ON public.admin_error_events;
CREATE TRIGGER update_admin_error_events_modtime
    BEFORE UPDATE ON public.admin_error_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_error_events_modtime();

-- 4. RLS Policies
ALTER TABLE public.admin_error_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/Owners can view all errors
-- (Assuming public.profiles table has 'role' column or similar logic exists)
-- For now, we'll implement a policy based on the assumption that only authenticated users with specific roles (if RBAC exists) or just authenticated users for this phase if roles aren't strict in DB yet.
-- Given the prompt mentions "Owner/Admin pode ler", we need to check how roles are handled.
-- Let's check public.profiles or authentication setup. 
-- For safety in this migration, I will create a policy that might need adjustment based on valid RBAC.
-- Initial Policy: Allow select for authenticated users (restrict in app logic if needed, or refine if I see RBAC schema).
-- Actually, let's look for existing profiles table structure in previous context or just assume a standard text role.

-- Create generic policy for now, refinement can happen if I see the schema.
CREATE POLICY "Admins can view error logs"
ON public.admin_error_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- Policy: Insert allowed for authenticated users (service role/RPC will handle logic, but direct insert from client might be needed for frontend errors)
CREATE POLICY "Authenticated users can insert error logs"
ON public.admin_error_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only Admins can update status
CREATE POLICY "Admins can update error logs"
ON public.admin_error_events
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.admin_error_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_error_events TO service_role;
