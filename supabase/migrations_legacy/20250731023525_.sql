-- Fix Google user detection and provider_type assignment

-- 1. Update existing Google users to have correct provider_type
UPDATE public.profiles 
SET provider_type = 'Google' 
WHERE provider_type = 'Email' 
AND id IN (
  SELECT id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'iss' = 'https://accounts.google.com'
);

-- 2. Update check_email_exists function to properly detect Google users
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS TABLE(email_exists boolean, provider_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN p.email IS NOT NULL THEN true ELSE false END as email_exists,
    CASE 
      WHEN au.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN 'Google'
      ELSE COALESCE(p.provider_type, 'Email')
    END as provider_type
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE p.email = email_to_check
  LIMIT 1;
  
  -- Se não encontrou na tabela profiles, retorna false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unknown'::text;
  END IF;
END;
$function$;

-- 3. Update handle_new_user trigger to correctly identify Google users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Criar perfil para o novo usuário
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
  
  -- Criar configurações padrão para o novo usuário
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;;
