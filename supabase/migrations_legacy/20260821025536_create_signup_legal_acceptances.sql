-- Evidence of the legal documents explicitly accepted when an email/password
-- account starts the free trial. This is not a paid contract and creates no
-- Stripe Customer or Subscription.

CREATE TABLE public.legal_document_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  acceptance_context text NOT NULL CHECK (acceptance_context = 'signup_trial'),
  terms_version text NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 80),
  privacy_version text NOT NULL CHECK (length(privacy_version) BETWEEN 1 AND 80),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, acceptance_context, terms_version, privacy_version)
);

CREATE INDEX legal_document_acceptances_user_created_idx
  ON public.legal_document_acceptances (user_id, created_at DESC);

ALTER TABLE public.legal_document_acceptances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.legal_document_acceptances
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.legal_document_acceptances TO service_role;

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
    IF NEW.raw_user_meta_data->>'terms_version' <> '2026-08-21.1-draft'
      OR NEW.raw_user_meta_data->>'privacy_version' <> '2026-08-21.1-draft'
    THEN
      RAISE EXCEPTION 'legal document version mismatch' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.legal_document_acceptances (
      user_id,
      acceptance_context,
      terms_version,
      privacy_version
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
