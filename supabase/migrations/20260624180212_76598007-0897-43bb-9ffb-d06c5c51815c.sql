
-- 1) Trigger: set started_at only when status transitions into "Em Andamento"
CREATE OR REPLACE FUNCTION public.set_ticket_started_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'Em Andamento'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Em Andamento')
     AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_started_at ON public.tickets;
CREATE TRIGGER trg_set_ticket_started_at
BEFORE INSERT OR UPDATE OF status ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_started_at();

-- 2) Backfill: recompute started_at from ticket_history (first time entering "Em Andamento")
WITH first_in_progress AS (
  SELECT ticket_id, MIN(created_at) AS at
  FROM public.ticket_history
  WHERE action = 'status_change' AND new_value = 'Em Andamento'
  GROUP BY ticket_id
)
UPDATE public.tickets t
SET started_at = fip.at
FROM first_in_progress fip
WHERE fip.ticket_id = t.id
  AND (t.started_at IS DISTINCT FROM fip.at);

-- Tickets currently "Em Andamento" with no history event: keep started_at (or set to picked_at as best effort)
-- For tickets that never entered "Em Andamento", clear started_at so TMA isn't inflated
UPDATE public.tickets t
SET started_at = NULL
WHERE t.started_at IS NOT NULL
  AND t.status <> 'Em Andamento'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_history h
    WHERE h.ticket_id = t.id
      AND h.action = 'status_change'
      AND h.new_value = 'Em Andamento'
  );
