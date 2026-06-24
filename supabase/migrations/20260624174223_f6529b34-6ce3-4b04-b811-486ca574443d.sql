
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS due_date_set_by uuid,
  ADD COLUMN IF NOT EXISTS due_date_set_at timestamptz;

CREATE OR REPLACE FUNCTION public.log_ticket_due_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.ticket_history(ticket_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.due_date_set_by), 'due_date_change',
            COALESCE(OLD.due_date::text, ''), COALESCE(NEW.due_date::text, ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ticket_due_date_change ON public.tickets;
CREATE TRIGGER trg_log_ticket_due_date_change
  AFTER UPDATE OF due_date ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_due_date_change();
