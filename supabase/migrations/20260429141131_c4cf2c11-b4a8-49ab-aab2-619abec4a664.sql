-- Tabela de histórico de realocações/alterações do patrimônio
CREATE TABLE public.patrimonio_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio_id uuid NOT NULL,
  organization_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  field text NOT NULL,
  old_value text,
  new_value text
);

CREATE INDEX idx_patrimonio_history_patrimonio_id ON public.patrimonio_history(patrimonio_id);
CREATE INDEX idx_patrimonio_history_changed_at ON public.patrimonio_history(changed_at DESC);

ALTER TABLE public.patrimonio_history ENABLE ROW LEVEL SECURITY;

-- Apenas leitura via cliente; INSERT só via trigger SECURITY DEFINER
CREATE POLICY "Users can view org patrimonio_history"
ON public.patrimonio_history
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR public.is_same_organization(organization_id)
);

-- Função de trigger: registra mudanças nos campos relevantes
CREATE OR REPLACE FUNCTION public.log_patrimonio_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NEW.responsible IS DISTINCT FROM OLD.responsible THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'responsible', OLD.responsible, NEW.responsible);
  END IF;
  IF NEW.sector IS DISTINCT FROM OLD.sector THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'sector', OLD.sector, NEW.sector);
  END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'location', OLD.location, NEW.location);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'status', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_patrimonio_changes
AFTER UPDATE ON public.patrimonio
FOR EACH ROW
EXECUTE FUNCTION public.log_patrimonio_changes();