-- Tabela de Alertas
CREATE TABLE IF NOT EXISTS admin_alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL, -- 'critical_spike', 'high_recurrence', 'module_explosion'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas de Feedback na tabela de erros
ALTER TABLE admin_error_events
ADD COLUMN IF NOT EXISTS classification_feedback BOOLEAN, -- true = correta, false = incorreta
ADD COLUMN IF NOT EXISTS severity_feedback BOOLEAN, -- true = correta, false = incorreta
ADD COLUMN IF NOT EXISTS suggested_category TEXT;

-- Função para calcular métricas de SLO (simples)
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

    -- SLO 1: Critical <= 4h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE resolved_at <= created_at + INTERVAL '4 hours')
    INTO v_total_critical, v_resolved_critical_in_4h
    FROM admin_error_events
    WHERE severity = 'critical'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 2: High <= 24h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE resolved_at <= created_at + INTERVAL '24 hours')
    INTO v_total_high, v_resolved_high_in_24h
    FROM admin_error_events
    WHERE severity = 'high'
      AND created_at >= v_data_start
      AND status = 'resolved';

    -- SLO 4: Recorrência (simulada por enquanto)
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
$$;

-- Atualizar cleanup para preservar Critical não resolvidos
DROP FUNCTION IF EXISTS cleanup_error_logs(INT);

CREATE OR REPLACE FUNCTION cleanup_error_logs(p_days_retention INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    WITH deleted AS (
        DELETE FROM admin_error_events
        WHERE created_at < NOW() - (p_days_retention || ' days')::INTERVAL
          AND NOT (severity = 'critical' AND status IN ('new', 'investigating')) -- Proteção
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    RETURN v_deleted_count;
END;
$$;

-- Função para verificar alertas
CREATE OR REPLACE FUNCTION check_error_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_critical_recent INT;
    v_high_spike_fingerprint TEXT;
BEGIN
    -- ALERTA A: >= 3 critical novos em 15 min
    SELECT COUNT(*) INTO v_critical_recent
    FROM admin_error_events
    WHERE severity = 'critical' 
      AND status = 'new'
      AND created_at >= NOW() - INTERVAL '15 minutes';

    IF v_critical_recent >= 3 THEN
        INSERT INTO admin_alert_events (alert_type, message, metadata, status)
        VALUES ('critical_spike', 'Detectado spike de erros CRÍTICOS (' || v_critical_recent || ') nos últimos 15 min.', jsonb_build_object('count', v_critical_recent), 'active')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ALERTA B: mesmo fingerprint high/critical >= 5 ocorrências em 30 min
    FOR v_high_spike_fingerprint IN 
        SELECT fingerprint 
        FROM admin_error_events 
        WHERE severity IN ('high', 'critical') 
          AND created_at >= NOW() - INTERVAL '30 minutes'
        GROUP BY fingerprint
        HAVING COUNT(*) >= 5
    LOOP
        INSERT INTO admin_alert_events (alert_type, message, metadata, status)
        VALUES ('high_recurrence', 'Fingerprint recorrente detectado (5+ em 30min).', jsonb_build_object('fingerprint', v_high_spike_fingerprint), 'active')
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- ALERTA C: módulo core com aumento > 200% em 1h
    INSERT INTO admin_alert_events (alert_type, message, metadata, status)
    SELECT 
        'module_explosion', 
        'Explosão de erros no módulo ' || module || ' (>20/h)', 
        jsonb_build_object('module', module, 'count', COUNT(*)),
        'active'
    FROM admin_error_events
    WHERE scope = 'core'
      AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY module
    HAVING COUNT(*) > 20;

END;
$$;;
