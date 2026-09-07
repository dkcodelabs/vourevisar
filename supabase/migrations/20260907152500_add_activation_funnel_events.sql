-- Activation analytics are observational only. They remain subject to the
-- existing owner-only RLS policy and cannot alter access or study state.
alter table public.user_events
  drop constraint if exists user_events_event_type_check;

alter table public.user_events
  add constraint user_events_event_type_check check (
    event_type = any (array[
      'SIGNUP',
      'LOGIN',
      'LOGIN_SUCCESS',
      'SESSION_START',
      'LOGOUT',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS',
      'EMAIL_CONFIRMED',
      'EMAIL_CHANGED',
      'MARKETING_CONSENT_GRANTED',
      'MARKETING_CONSENT_REVOKED',
      'ACCOUNT_DEACTIVATED',
      'ACCOUNT_REACTIVATED',
      'ROLE_CHANGED',
      'PROFILE_UPDATED',
      'ACTIVATION_VIEWED',
      'ACTIVATION_METHOD_SELECTED',
      'ACTIVATION_EDITAL_READY',
      'ACTIVATION_CYCLE_READY',
      'ACTIVATION_COMPLETED',
      'ACCESS_RECOVERY_VIEWED',
      'ACCESS_RECOVERY_CHECKOUT_STARTED'
    ]::text[]
  ));
