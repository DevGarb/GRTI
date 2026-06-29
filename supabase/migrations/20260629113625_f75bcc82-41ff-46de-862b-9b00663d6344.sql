
-- Fix: BEFORE INSERT trigger was inserting into task_status_history with NEW.id
-- before the row existed, violating FK. Split into BEFORE (defaults) + AFTER (history).

CREATE OR REPLACE FUNCTION public.task_status_change_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Concluído' AND NEW.delivered_date IS NULL THEN
      NEW.delivered_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_status_history(task_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF OLD.status = 'Concluído' AND NEW.status NOT IN ('Concluído') THEN
      NEW.rework_count := COALESCE(OLD.rework_count, 0) + 1;
      NEW.reopened_at := now();
      IF NEW.status NOT IN ('Retrabalho') THEN
        NEW.status := 'Retrabalho';
      END IF;
      NEW.delivered_date := NULL;
    ELSIF NEW.status = 'Concluído' AND OLD.status <> 'Concluído' THEN
      NEW.delivered_date := COALESCE(NEW.delivered_date, CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.task_status_history_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.task_status_history(task_id, old_status, new_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, auth.uid());
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_task_status_history_insert ON public.project_tasks;
CREATE TRIGGER trg_task_status_history_insert
AFTER INSERT ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.task_status_history_after_insert();
