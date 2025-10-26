-- =====================================================
-- INICIALIZAR ASSINATURAS PARA USUÁRIOS EXISTENTES
-- =====================================================

-- Criar assinatura trial para todos os usuários que não têm
INSERT INTO user_subscriptions (user_id, plan, status, trial_started_at, trial_ends_at)
SELECT 
  p.id,
  'free_trial'::subscription_plan,
  'trial'::subscription_status,
  NOW(),
  NOW() + INTERVAL '7 days'
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verificar resultado
SELECT 
  p.email,
  us.plan,
  us.status,
  us.trial_ends_at,
  EXTRACT(DAY FROM us.trial_ends_at - NOW()) as days_remaining
FROM profiles p
JOIN user_subscriptions us ON us.user_id = p.id
ORDER BY p.email;