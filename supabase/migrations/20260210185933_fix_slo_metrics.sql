CREATE OR REPLACE FUNCTION calculate_slo_metrics(
    p_days_window INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_critical INT;
    v_resolved_critical_in_4h INT;
    v_total_high INT;
    v_resolved_high_in_24h INT;
    v_recurrence_rate NUMERIC;
    v_data_start TIMESTAMPTZ;
BEGIN
    v_data_start := NOW() - (p_days_window || ' days')::INTERVAL;

    -- SLO 1: Critical <= 4h (Using updated_at as resolution time)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE updated_at <= created_at + INTERVAL '4 hours')
    INTO v_total_critical, v_resolved_critical_in_4h
    FROM admin_error_events
    WHERE severity = 'critical'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 2: High <= 24h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE updated_at <= created_at + INTERVAL '24 hours')
    INTO v_total_high, v_resolved_high_in_24h
    FROM admin_error_events
    WHERE severity = 'high'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 4: Recorrência
    SELECT 
        COALESCE(AVG(CASE WHEN occurrence_count > 1 THEN 1 ELSE 0 END) * 100, 0)
    INTO v_recurrence_rate
    FROM admin_error_events
    WHERE created_at >= v_data_start;

    RETURN jsonb_build_object(
        'critical_within_4h_pct', CASE WHEN v_total_critical > 0 THEN ROUND((v_resolved_critical_in_4h::NUMERIC / v_total_critical) * 100, 2) ELSE 100 END,
        'high_within_24h_pct', CASE WHEN v_total_high > 0 THEN ROUND((v_resolved_high_in_24h::NUMERIC / v_total_high) * 100, 2) ELSE 100 END,
        'recurrence_rate', ROUND(v_recurrence_rate, 2),
        'total_critical', v_total_critical,
        'total_high', v_total_high
    );
END;
$$;;
