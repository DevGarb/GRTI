
CREATE TABLE public.chk_imp_checklists (
  id bigint PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type integer NOT NULL DEFAULT 1,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chk_imp_categories (
  id bigint PRIMARY KEY,
  checklist_id bigint NOT NULL REFERENCES public.chk_imp_checklists(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_id bigint,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chk_imp_items (
  id bigint PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES public.chk_imp_categories(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  scale integer,
  weight numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chk_imp_item_options (
  id bigint PRIMARY KEY,
  item_id bigint NOT NULL REFERENCES public.chk_imp_items(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  text text NOT NULL,
  value numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chk_imp_categories_checklist ON public.chk_imp_categories(checklist_id);
CREATE INDEX idx_chk_imp_items_category ON public.chk_imp_items(category_id);
CREATE INDEX idx_chk_imp_item_options_item ON public.chk_imp_item_options(item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_imp_checklists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_imp_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_imp_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_imp_item_options TO authenticated;
GRANT ALL ON public.chk_imp_checklists TO service_role;
GRANT ALL ON public.chk_imp_categories TO service_role;
GRANT ALL ON public.chk_imp_items TO service_role;
GRANT ALL ON public.chk_imp_item_options TO service_role;

ALTER TABLE public.chk_imp_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chk_imp_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chk_imp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chk_imp_item_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chk_imp_checklists_select" ON public.chk_imp_checklists FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "chk_imp_checklists_write" ON public.chk_imp_checklists FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "chk_imp_categories_select" ON public.chk_imp_categories FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "chk_imp_categories_write" ON public.chk_imp_categories FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "chk_imp_items_select" ON public.chk_imp_items FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "chk_imp_items_write" ON public.chk_imp_items FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "chk_imp_item_options_select" ON public.chk_imp_item_options FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "chk_imp_item_options_write" ON public.chk_imp_item_options FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_chk_imp_checklists_updated BEFORE UPDATE ON public.chk_imp_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chk_imp_categories_updated BEFORE UPDATE ON public.chk_imp_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chk_imp_items_updated BEFORE UPDATE ON public.chk_imp_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_chk_imp_item_options_updated BEFORE UPDATE ON public.chk_imp_item_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chk_templates ADD COLUMN IF NOT EXISTS import_checklist_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chk_templates_import ON public.chk_templates(organization_id, import_checklist_id)
  WHERE import_checklist_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.chk_import_generate_templates(_organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _c record;
  _tpl uuid;
BEGIN
  IF NOT (public.has_role_in_org(auth.uid(), 'admin', _organization_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  FOR _c IN
    SELECT id, name, description, active
    FROM public.chk_imp_checklists
    WHERE organization_id = _organization_id AND type = 1
  LOOP
    SELECT t.id INTO _tpl FROM public.chk_templates t
      WHERE t.organization_id = _organization_id AND t.import_checklist_id = _c.id;

    IF _tpl IS NULL THEN
      INSERT INTO public.chk_templates (organization_id, title, description, frequency, is_active, created_by, import_checklist_id)
      VALUES (_organization_id, _c.name, _c.description, 'unica', _c.active, auth.uid(), _c.id)
      RETURNING id INTO _tpl;
    ELSE
      UPDATE public.chk_templates
        SET title = _c.name, description = _c.description, is_active = _c.active, updated_at = now()
        WHERE id = _tpl;
      DELETE FROM public.chk_template_items WHERE template_id = _tpl;
    END IF;

    INSERT INTO public.chk_template_items (template_id, organization_id, title, weight, requires_photo, sort_order)
    SELECT _tpl, _organization_id,
           left(cat.name || ' - ' || it.name, 500),
           GREATEST(1, LEAST(10, round(it.weight)))::smallint,
           false,
           row_number() OVER (ORDER BY cat.sort_order, cat.id, it.sort_order, it.id)
    FROM public.chk_imp_items it
    JOIN public.chk_imp_categories cat ON cat.id = it.category_id
    WHERE cat.checklist_id = _c.id;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.chk_import_generate_templates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chk_import_generate_templates(uuid) TO authenticated;
