-- 1. Validation trigger for satisfaction scores (must be 1-5)
CREATE OR REPLACE FUNCTION public.validate_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'satisfaction' THEN
    IF NEW.score < 1 OR NEW.score > 5 THEN
      RAISE EXCEPTION 'CSAT score must be between 1 and 5, got %', NEW.score;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_evaluation_trigger ON public.evaluations;
CREATE TRIGGER validate_evaluation_trigger
BEFORE INSERT OR UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.validate_evaluation();

-- 2. Unique index: at most one evaluation of each type per ticket
-- First, deduplicate any existing duplicates (keep latest)
DELETE FROM public.evaluations e1
USING public.evaluations e2
WHERE e1.ticket_id = e2.ticket_id
  AND e1.type = e2.type
  AND e1.created_at < e2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS evaluations_ticket_type_unique
ON public.evaluations(ticket_id, type);