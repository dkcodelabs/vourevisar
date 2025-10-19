-- Create table to track API usage for rate limiting
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own usage
CREATE POLICY "Users can view their own API usage"
  ON public.api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for efficient rate limit checks
CREATE INDEX IF NOT EXISTS idx_api_usage_user_endpoint_window 
  ON public.api_usage(user_id, endpoint, window_start);

-- Create function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID, 
  p_endpoint TEXT, 
  p_max_per_hour INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the start of the current hour window
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM api_usage
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Return true if under limit
  RETURN v_count < p_max_per_hour;
END;
$$;

-- Create function to log API usage
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the start of the current hour window
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Insert or update usage record
  INSERT INTO api_usage (user_id, endpoint, request_count, last_request, window_start)
  VALUES (p_user_id, p_endpoint, 1, NOW(), v_window_start)
  ON CONFLICT (user_id, endpoint, window_start) 
  DO UPDATE SET
    request_count = api_usage.request_count + 1,
    last_request = NOW();
END;
$$;

-- Add unique constraint for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_unique_window 
  ON public.api_usage(user_id, endpoint, window_start);