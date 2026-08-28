update public.user_editais
set cycle_archived_at = now()
where coalesce(merged_into_cycle, false) = false
  and cycle_archived_at is null;;
