ALTER TABLE public.chk_execution_items ADD COLUMN IF NOT EXISTS not_applicable boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.chk_recompute_execution_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _exec_id uuid := COALESCE(NEW.execution_id, OLD.execution_id);
  _score numeric;
BEGIN
  SELECT
    CASE WHEN SUM(ti.weight) > 0
      THEN ROUND(SUM(CASE WHEN ei.done THEN ti.weight ELSE 0 END)::numeric * 100.0 / SUM(ti.weight), 2)
      ELSE 0
    END
  INTO _score
  FROM public.chk_execution_items ei
  JOIN public.chk_template_items ti ON ti.id = ei.template_item_id
  WHERE ei.execution_id = _exec_id AND ei.not_applicable = false;

  UPDATE public.chk_executions
     SET score = _score,
         started_at = COALESCE(started_at, now()),
         status = CASE
           WHEN status = 'concluida' THEN 'concluida'
           WHEN EXISTS (SELECT 1 FROM public.chk_execution_items x WHERE x.execution_id = _exec_id AND x.answered_at IS NOT NULL)
             THEN 'em_andamento'::public.chk_execution_status
           ELSE status
         END
   WHERE id = _exec_id AND status <> 'concluida';
  RETURN NULL;
END $function$;