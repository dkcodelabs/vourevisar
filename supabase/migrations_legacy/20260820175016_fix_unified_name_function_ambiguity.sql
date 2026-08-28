-- Qualify merge table columns and use positional arguments so PostgreSQL does
-- not confuse the function's user_id parameter with subject_merges.user_id.
CREATE OR REPLACE FUNCTION public.get_unified_subject_name(subject_id uuid, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merge_record RECORD;
BEGIN
  SELECT sm.display_name INTO merge_record
  FROM public.subject_merges AS sm
  WHERE sm.primary_subject_id = $1
    AND sm.user_id = $2
    AND sm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;

  SELECT sm.display_name INTO merge_record
  FROM public.subject_merges AS sm
  WHERE sm.merged_subject_ids ?| ARRAY[$1::text]
    AND sm.user_id = $2
    AND sm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unified_topic_name(topic_id uuid, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merge_record RECORD;
BEGIN
  SELECT tm.display_name INTO merge_record
  FROM public.topic_merges AS tm
  WHERE tm.primary_topic_id = $1
    AND tm.user_id = $2
    AND tm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;

  SELECT tm.display_name INTO merge_record
  FROM public.topic_merges AS tm
  WHERE tm.merged_topic_ids ?| ARRAY[$1::text]
    AND tm.user_id = $2
    AND tm.status = 'active'
  LIMIT 1;

  IF FOUND THEN RETURN merge_record.display_name; END IF;
  RETURN NULL;
END;
$$;
