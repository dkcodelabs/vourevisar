DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'topics'
        AND column_name = 'total_volume'
    ) THEN
        ALTER TABLE topics ADD COLUMN total_volume INTEGER DEFAULT 0;
    END IF;
END $$;

DROP FUNCTION IF EXISTS get_all_topics_admin(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_all_topics_admin(
    page_number INTEGER,
    page_size INTEGER
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    subject_name TEXT,
    last_trend_check_at TIMESTAMPTZ,
    is_skipped BOOLEAN,
    skip_reason TEXT,
    created_at TIMESTAMPTZ,
    user_email TEXT,
    total_volume INTEGER,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        COALESCE(s.name, 'Sem Matéria') as subject_name,
        t.last_trend_check_at,
        t.is_skipped,
        t.skip_reason,
        t.created_at,
        (SELECT email FROM auth.users WHERE id = t.user_id) as user_email,
        COALESCE(t.total_volume, 0) as total_volume,
        COUNT(*) OVER() as total_count
    FROM
        topics t
    LEFT JOIN
        subjects s ON t.materia_id = s.id
    ORDER BY
        t.last_trend_check_at DESC NULLS LAST,
        t.created_at DESC
    LIMIT
        page_size
    OFFSET
        (page_number - 1) * page_size;
END;
$$;;
