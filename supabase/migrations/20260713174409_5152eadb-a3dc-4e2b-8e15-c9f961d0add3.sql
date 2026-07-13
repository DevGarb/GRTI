-- Menu configuration per organization (whitelist mode)
CREATE TABLE public.organization_menu_config (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, menu_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_menu_config TO authenticated;
GRANT ALL ON public.organization_menu_config TO service_role;

ALTER TABLE public.organization_menu_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated member of the org may read the config (needed to compute menus)
CREATE POLICY "members read org menu config"
ON public.organization_menu_config
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
      AND uo.organization_id = organization_menu_config.organization_id
  )
);

-- Only super_admin or admin of the org can mutate
CREATE POLICY "admins manage org menu config"
ON public.organization_menu_config
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_organization_roles r
    WHERE r.user_id = auth.uid()
      AND r.organization_id = organization_menu_config.organization_id
      AND r.role = 'admin'
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_organization_roles r
    WHERE r.user_id = auth.uid()
      AND r.organization_id = organization_menu_config.organization_id
      AND r.role = 'admin'
  )
);

CREATE TRIGGER update_organization_menu_config_updated_at
BEFORE UPDATE ON public.organization_menu_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed GRCHECK: only chk-* menus
INSERT INTO public.organization_menu_config (organization_id, menu_key, enabled)
SELECT o.id, k, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('chk-dashboard'),('chk-minhas'),('chk-execucoes'),('chk-modelos'),
  ('chk-atribuicoes'),('chk-empresas'),('chk-setores'),('chk-relatorios'),
  ('configuracoes')
) AS m(k)
WHERE o.slug = 'grcheck'
ON CONFLICT DO NOTHING;

-- Seed CGPS Operacional: op-* + universals
INSERT INTO public.organization_menu_config (organization_id, menu_key, enabled)
SELECT o.id, k, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('op-cadastros'),('op-entregas'),('op-oficina'),('op-manutencao'),
  ('configuracoes'),('todos'),('usuarios'),('white-label'),
  ('integracoes'),('documentacao'),('super-admin'),('planos'),('migracao')
) AS m(k)
WHERE o.slug = 'cgps-operacional'
ON CONFLICT DO NOTHING;