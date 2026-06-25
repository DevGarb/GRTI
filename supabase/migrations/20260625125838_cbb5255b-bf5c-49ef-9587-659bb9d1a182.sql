DO $$
DECLARE
  v_org uuid := 'a543a17b-0def-4ceb-acf5-91017f2b0ad3';
  v_preset uuid := '9d73edc2-8778-462e-a056-9729be86d8ef';
  v_overrides jsonb;
BEGIN
  SELECT overrides INTO v_overrides FROM public.menu_permission_presets WHERE id = v_preset;

  CREATE TEMP TABLE _targets ON COMMIT DROP AS
  SELECT uo.user_id
  FROM public.user_organizations uo
  WHERE uo.organization_id = v_org
    AND uo.user_id NOT IN (
      SELECT user_id FROM public.user_organization_roles
      WHERE organization_id = v_org AND role IN ('admin','tecnico','desenvolvedor','auditor')
    )
    AND uo.user_id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'super_admin');

  DELETE FROM public.user_menu_overrides
  WHERE organization_id = v_org
    AND user_id IN (SELECT user_id FROM _targets);

  INSERT INTO public.user_menu_overrides (user_id, menu_key, granted, organization_id)
  SELECT t.user_id, kv.key, (kv.value #>> '{}') = 'grant', v_org
  FROM _targets t
  CROSS JOIN LATERAL jsonb_each(v_overrides) kv;

  INSERT INTO public.user_applied_presets (user_id, organization_id, preset_id)
  SELECT user_id, v_org, v_preset FROM _targets
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET preset_id = EXCLUDED.preset_id, updated_at = now();
END $$;