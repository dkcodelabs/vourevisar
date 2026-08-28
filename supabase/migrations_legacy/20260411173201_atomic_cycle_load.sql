
-- RPC atômica para carregar edital no ciclo sem inconsistência
-- Todas as escritas ocorrem dentro de uma única transação

CREATE OR REPLACE FUNCTION atomic_cycle_load(
  p_user_id        UUID,
  p_new_edital_id  UUID,
  p_new_subject_ids TEXT[],
  p_old_edital_ids  UUID[],   -- editais a desmarcar do ciclo (replace)
  p_mode           TEXT       -- 'replace' | 'merge'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_id UUID;
  v_old_id   UUID;
BEGIN
  -- 1. Desmarcar editais antigos do ciclo (somente no modo replace)
  IF p_mode = 'replace' AND array_length(p_old_edital_ids, 1) > 0 THEN
    FOREACH v_old_id IN ARRAY p_old_edital_ids LOOP
      UPDATE user_editais
      SET merged_into_cycle = false,
          active_subject_ids = '{}'
      WHERE id = v_old_id
        AND user_id = p_user_id;
    END LOOP;
  END IF;

  -- 2. Atualizar ou inserir o registro em user_cycles
  SELECT id INTO v_cycle_id
  FROM user_cycles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_cycle_id IS NOT NULL THEN
    UPDATE user_cycles
    SET ciclo_atual  = p_new_subject_ids,
        atualizado_em = NOW()
    WHERE id = v_cycle_id;
  ELSE
    INSERT INTO user_cycles (user_id, ciclo_atual)
    VALUES (p_user_id, p_new_subject_ids)
    RETURNING id INTO v_cycle_id;
  END IF;

  -- 3. Marcar o novo edital como merged (APENAS após ciclo atualizado)
  UPDATE user_editais
  SET merged_into_cycle     = true,
      active_subject_ids    = p_new_subject_ids
  WHERE id = p_new_edital_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'ok',       true,
    'cycle_id', v_cycle_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Qualquer erro faz rollback automático de tudo acima
  RETURN jsonb_build_object(
    'ok',    false,
    'error', SQLERRM
  );
END;
$$;

-- Permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION atomic_cycle_load TO authenticated;
;
