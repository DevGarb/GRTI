
-- Backfill correto do tempo de atendimento dos chamados legados do Danilo
DO $$
DECLARE
  v_user uuid := 'badd1fc1-80a7-49b7-985f-4c9444ee8112';
  r record;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  FOR r IN
    SELECT t.id, t.created_at, t.closed_at, t.started_at, t.organization_id
    FROM tickets t
    WHERE t.assigned_to = v_user
      AND t.status = 'Fechado'
      AND t.closed_at >= '2026-06-01'
      AND NOT EXISTS (
        SELECT 1 FROM ticket_history h
        WHERE h.ticket_id = t.id
          AND h.action = 'status_change'
          AND h.new_value = 'Em Andamento'
      )
  LOOP
    -- Start = first comment by Danilo, fallback created_at
    SELECT MIN(created_at) INTO v_start FROM ticket_comments
      WHERE ticket_id = r.id AND user_id = v_user;
    IF v_start IS NULL OR v_start < r.created_at THEN
      v_start := r.created_at;
    END IF;

    -- End = last comment by Danilo, fallback closed_at
    SELECT MAX(created_at) INTO v_end FROM ticket_comments
      WHERE ticket_id = r.id AND user_id = v_user;
    IF v_end IS NULL OR v_end <= v_start THEN
      v_end := r.closed_at;
    END IF;
    IF v_end <= v_start THEN
      v_end := v_start + INTERVAL '30 minutes';
    END IF;
    IF v_end > r.closed_at THEN
      v_end := r.closed_at;
    END IF;

    -- Update started_at
    UPDATE tickets SET started_at = v_start WHERE id = r.id;

    -- Insert synthetic history so SLA logic computes the real window
    INSERT INTO ticket_history (ticket_id, user_id, action, old_value, new_value, created_at)
    VALUES
      (r.id, v_user, 'status_change', 'Aberto', 'Em Andamento', v_start),
      (r.id, v_user, 'status_change', 'Em Andamento', 'Aguardando Aprovação', v_end);
  END LOOP;
END $$;
