
-- Cache de insights diários (evita regerar via IA toda chamada)
CREATE TABLE public.daily_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_from timestamptz NOT NULL,
  reference_to timestamptz NOT NULL,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  technician_summaries jsonb NOT NULL DEFAULT '{}'::jsonb,
  whatsapp_message text,
  op_status text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, reference_from, reference_to)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_insights_cache TO authenticated;
GRANT ALL ON public.daily_insights_cache TO service_role;

ALTER TABLE public.daily_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view org insights cache" ON public.daily_insights_cache
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins insert org insights cache" ON public.daily_insights_cache
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins update org insights cache" ON public.daily_insights_cache
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role)));

CREATE TRIGGER trg_daily_insights_cache_updated_at
  BEFORE UPDATE ON public.daily_insights_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: backlog e contagem de técnicos ativos (agregados que não estavam em get_management_metrics)
CREATE OR REPLACE FUNCTION public.get_executive_overview(_organization_id uuid)
RETURNS TABLE(
  backlog_total integer,
  open_count integer,
  in_progress_count integer,
  awaiting_approval_count integer,
  active_technicians integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH t AS (
    SELECT status, assigned_to FROM public.tickets
    WHERE organization_id = _organization_id
      AND status IN ('Aberto','Em Andamento','Aguardando Aprovação','Disponível')
  )
  SELECT
    (SELECT COUNT(*) FROM t)::int,
    (SELECT COUNT(*) FROM t WHERE status = 'Aberto')::int,
    (SELECT COUNT(*) FROM t WHERE status = 'Em Andamento')::int,
    (SELECT COUNT(*) FROM t WHERE status = 'Aguardando Aprovação')::int,
    (SELECT COUNT(DISTINCT assigned_to) FROM t WHERE assigned_to IS NOT NULL)::int;
$$;
