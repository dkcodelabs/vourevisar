-- Fix security advisor warnings by updating functions with secure search_path

-- Drop and recreate update_updated_at_column function with secure search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Drop and recreate handle_new_user function with secure search_path
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $function$
BEGIN
  -- Criar perfil para o novo usuário
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'), 
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Criar configurações padrão para o novo usuário
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Recreate triggers that were dropped with the functions
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
    BEFORE UPDATE ON public.study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pomodoro_sessions_updated_at
    BEFORE UPDATE ON public.pomodoro_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_cycles_updated_at
    BEFORE UPDATE ON public.user_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate the auth trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();