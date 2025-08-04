-- Zera o campo review_profile para todos os usuários que já possuem revisões
UPDATE user_settings
SET review_profile = NULL
WHERE user_id IN (
  SELECT DISTINCT user_id FROM topics WHERE review_count > 0
); 