-- Fix mutable search_path in database functions
-- Adding SET search_path = public to all functions that don't have it

-- Fix calculate_difficulty_points
ALTER FUNCTION public.calculate_difficulty_points(uuid, date) SET search_path = public;

-- Fix calculate_user_analytics
ALTER FUNCTION public.calculate_user_analytics(uuid) SET search_path = public;

-- Fix get_daily_progress
ALTER FUNCTION public.get_daily_progress(uuid) SET search_path = public;

-- Fix get_estimated_time_by_difficulty
ALTER FUNCTION public.get_estimated_time_by_difficulty(integer) SET search_path = public;

-- Fix get_points_by_difficulty
ALTER FUNCTION public.get_points_by_difficulty(integer) SET search_path = public;

-- Fix get_subscription_info
ALTER FUNCTION public.get_subscription_info(uuid) SET search_path = public;

-- Fix get_user_difficulty_stats
ALTER FUNCTION public.get_user_difficulty_stats(uuid) SET search_path = public;

-- Fix register_topic_review (trigger function)
ALTER FUNCTION public.register_topic_review() SET search_path = public;

-- Fix reset_daily_progress
ALTER FUNCTION public.reset_daily_progress() SET search_path = public;

-- Fix suggest_topics_by_time
ALTER FUNCTION public.suggest_topics_by_time(uuid, integer) SET search_path = public;

-- Fix test_difficulty_system
ALTER FUNCTION public.test_difficulty_system() SET search_path = public;

-- Fix test_owner_access
ALTER FUNCTION public.test_owner_access() SET search_path = public;

-- Fix update_daily_progress
ALTER FUNCTION public.update_daily_progress(uuid, text) SET search_path = public;

-- Fix update_difficulty_timestamp (trigger function)
ALTER FUNCTION public.update_difficulty_timestamp() SET search_path = public;

-- Fix update_study_sessions_updated_at (trigger function)
ALTER FUNCTION public.update_study_sessions_updated_at() SET search_path = public;

-- Fix update_subscription_updated_at (trigger function)
ALTER FUNCTION public.update_subscription_updated_at() SET search_path = public;

-- Fix update_user_study_analytics_updated_at (trigger function)
ALTER FUNCTION public.update_user_study_analytics_updated_at() SET search_path = public;