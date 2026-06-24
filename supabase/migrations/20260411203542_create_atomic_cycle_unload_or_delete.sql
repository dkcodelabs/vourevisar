
CREATE OR REPLACE FUNCTION public.atomic_cycle_unload_or_delete(
  p_user_id    UUID,
  p_edital_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_id       UUID;
  v_active_count   INT;
BEGIN
  -- 1. Desmarcar o edital como não-mesclado
  UPDATE user_editais
  SET merged_into_cycle = false,
      active_subject_ids = '{}'
  WHERE id = p_edital_id
    AND user_id = p_user_id;

  -- 2. Buscar o ciclo ativo do usuário
  SELECT id INTO v_cycle_id
  FROM user_cycles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Se não há ciclo, já estamos ok
  IF v_cycle_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'action', 'no_cycle',
      'cycle_deleted', false
    );
  END IF;

  -- 3. Contar quantos editais ainda estão ativos no ciclo
  SELECT COUNT(*) INTO v_active_count
  FROM user_editais
  WHERE user_id = p_user_id
    AND merged_into_cycle = true;

  -- 4. Se nenhum edital ativo restou, deletar o ciclo inteiro
  IF v_active_count = 0 THEN
    DELETE FROM user_cycles WHERE id = v_cycle_id;

    RETURN jsonb_build_object(
      'ok', true,
      'action', 'cycle_deleted',
      'cycle_deleted', true,
      'cycle_id', v_cycle_id
    );
  END IF;

  -- Caso contrário, apenas retornar que o edital foi removido do ciclo
  RETURN jsonb_build_object(
    'ok', true,
    'action', 'edital_unloaded',
    'cycle_deleted', false,
    'remaining_editais', v_active_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM
  );
END;
$$;
;
