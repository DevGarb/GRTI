ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS rework_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_ticket_rework_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action = 'rework' THEN
    UPDATE public.tickets
      SET rework_count = COALESCE(rework_count, 0) + 1
      WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_ticket_rework_count ON public.ticket_history;
CREATE TRIGGER trg_bump_ticket_rework_count
AFTER INSERT ON public.ticket_history
FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_rework_count();

UPDATE public.tickets t
SET rework_count = COALESCE(h.cnt, 0)
FROM (
  SELECT ticket_id, COUNT(*)::int AS cnt
  FROM public.ticket_history
  WHERE action = 'rework'
  GROUP BY ticket_id
) h
WHERE h.ticket_id = t.id AND t.rework_count IS DISTINCT FROM h.cnt;