-- Add error handling to handle_new_user function
-- This improves the robustness of the user signup flow by preventing
-- profile/settings creation errors from blocking the entire signup process

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
BEGIN
  -- Wrap in exception handler to prevent signup blocking
  BEGIN
    -- Create profile for the new user
    INSERT INTO public.profiles (id, name, email, avatar_url, provider_type)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'), 
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url',
      CASE 
        WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN 'Google'
        WHEN NEW.raw_user_meta_data->>'provider_type' IS NOT NULL THEN NEW.raw_user_meta_data->>'provider_type'
        ELSE 'Email'
      END
    );
    
    -- Create default settings for the new user
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block signup
    -- The error will be visible in Postgres logs for debugging
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    
    -- Optionally, you could insert into an error log table here
    -- INSERT INTO error_logs (user_id, function_name, error_message, error_state)
    -- VALUES (NEW.id, 'handle_new_user', SQLERRM, SQLSTATE);
  END;
  
  RETURN NEW;
END;
$function$;