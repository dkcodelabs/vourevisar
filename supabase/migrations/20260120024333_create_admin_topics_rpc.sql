
CREATE OR REPLACE FUNCTION get_all_topics_admin(
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    subject_name TEXT,
    last_trend_check_at TIMESTAMPTZ,
    is_skipped BOOLEAN,
    skip_reason TEXT,
    created_at TIMESTAMPTZ,
    user_email VARCHAR,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- ⚠️ Roda com permissões de quem criou (admin), ignorando RLS
AS $$
DECLARE
    offset_val INTEGER;
BEGIN
    offset_val := (page_number - 1) * page_size;

    RETURN QUERY
    WITH total AS (
        SELECT COUNT(*) as cnt FROM topics
    )
    SELECT 
        t.id,
        t.name,
        COALESCE(s.name, '🚫 Sem matéria') as subject_name,
        t.last_trend_check_at,
        t.is_skipped,
        t.skip_reason,
        t.created_at,
        CAST(u.email AS VARCHAR) as user_email,
        (SELECT cnt FROM total) as total_count
    FROM topics t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN auth.users u ON s.user_id = u.id
    ORDER BY t.created_at DESC
    LIMIT page_size
    OFFSET offset_val;
END;
$$;
;
