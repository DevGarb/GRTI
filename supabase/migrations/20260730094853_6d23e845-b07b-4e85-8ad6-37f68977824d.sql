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
    WHERE organization_id = _organization_id
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