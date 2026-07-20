ALTER TABLE public.tickets ADD COLUMN aguardando_aprovacao_at timestamptz;

UPDATE public.tickets t
SET aguardando_aprovacao_at = h.first_at
FROM (
  SELECT ticket_id, min(created_at) AS first_at
  FROM public.ticket_history
  WHERE action = 'status_change' AND new_value = 'Aguardando Aprovação'
  GROUP BY ticket_id
) h
WHERE h.ticket_id = t.id;

CREATE OR REPLACE FUNCTION public.set_aguardando_aprovacao_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Aguardando Aprovação' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.aguardando_aprovacao_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_aguardando_aprovacao_at ON public.tickets;
CREATE TRIGGER trg_set_aguardando_aprovacao_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_aguardando_aprovacao_at();