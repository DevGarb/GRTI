CREATE OR REPLACE FUNCTION public.log_patrimonio_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := COALESCE(auth.uid(), NEW.created_by);
BEGIN
  IF NEW.responsible IS NOT NULL AND NEW.responsible <> '' THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'responsible', NULL, NEW.responsible);
  END IF;
  IF NEW.sector IS NOT NULL AND NEW.sector <> '' THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'sector', NULL, NEW.sector);
  END IF;
  IF NEW.location IS NOT NULL AND NEW.location <> '' THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'location', NULL, NEW.location);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_patrimonio_insert ON public.patrimonio;
CREATE TRIGGER trg_log_patrimonio_insert
AFTER INSERT ON public.patrimonio
FOR EACH ROW
EXECUTE FUNCTION public.log_patrimonio_insert();