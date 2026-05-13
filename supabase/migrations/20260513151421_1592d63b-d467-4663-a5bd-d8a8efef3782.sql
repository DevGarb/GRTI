ALTER TABLE public.user_menu_overrides DROP CONSTRAINT IF EXISTS user_menu_overrides_user_id_menu_key_key;
DELETE FROM public.user_menu_overrides WHERE organization_id IS NULL;
ALTER TABLE public.user_menu_overrides ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.user_menu_overrides ADD CONSTRAINT user_menu_overrides_user_org_menu_key UNIQUE (user_id, organization_id, menu_key);
CREATE INDEX IF NOT EXISTS idx_umo_user_org ON public.user_menu_overrides(user_id, organization_id);