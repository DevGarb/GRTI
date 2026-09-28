GRANT UPDATE ON public.evaluations TO authenticated;
DROP POLICY IF EXISTS "Admins or evaluator can update evaluations" ON public.evaluations;
CREATE POLICY "Admins or evaluator can update evaluations" ON public.evaluations
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR evaluator_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()) OR evaluator_id = auth.uid());

DO $mig$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['get_metas_tecnicos','get_mvp_chamados_metrics','get_management_metrics','get_management_metrics_admin'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname=f LIMIT 1;
    d := replace(d, 'COALESCE(cat.score::numeric,', 'COALESCE((SELECT em.score FROM public.evaluations em WHERE em.ticket_id = c.id AND em.type = ''meta'' ORDER BY em.created_at DESC LIMIT 1)::numeric, cat.score::numeric,');
    EXECUTE d;
  END LOOP;
  SELECT pg_get_functiondef('public.get_tv_goals_summary'::regproc) INTO d;
  d := replace(d, 'COALESCE(c.score::numeric,', 'COALESCE((SELECT em.score FROM public.evaluations em WHERE em.ticket_id = t.id AND em.type = ''meta'' ORDER BY em.created_at DESC LIMIT 1)::numeric, c.score::numeric,');
  EXECUTE d;
END
$mig$;