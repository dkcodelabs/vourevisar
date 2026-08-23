-- Restore the Supabase Auth onboarding trigger.
--
-- The schema-only bootstrap of isolated environments does not include
-- auth.users triggers. Without this trigger, a confirmed signup has no
-- public.profiles row and the client correctly refuses to establish a
-- session. Keep this migration idempotent so it is safe on Live, where the
-- trigger may already exist.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, provider_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    CASE
      WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN 'Google'
      WHEN NEW.raw_user_meta_data->>'provider_type' IS NOT NULL THEN NEW.raw_user_meta_data->>'provider_type'
      ELSE 'Email'
    END
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.billing_access_grants (
    user_id, source, plan_code, starts_at, ends_at, reason
  ) VALUES (
    NEW.id, 'trial', 'free_trial', now(), now() + interval '7 days', 'Teste gratuito inicial'
  ) ON CONFLICT (user_id) WHERE source = 'trial' DO NOTHING;

  IF NEW.raw_user_meta_data->>'legal_documents_accepted' = 'true' THEN
    IF NEW.raw_user_meta_data->>'terms_version' <> '2026-08-21.1'
      OR NEW.raw_user_meta_data->>'privacy_version' <> '2026-08-21.1'
    THEN
      RAISE EXCEPTION 'legal document version mismatch' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.legal_document_acceptances (
      user_id, acceptance_context, terms_version, privacy_version
    ) VALUES (
      NEW.id,
      'signup_trial',
      NEW.raw_user_meta_data->>'terms_version',
      NEW.raw_user_meta_data->>'privacy_version'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
