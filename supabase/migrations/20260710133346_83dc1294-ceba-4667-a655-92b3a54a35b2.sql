-- Rename existing 'checklists' org to GRCHECK (slug 'grcheck'); keep same id so all chk_* rows stay valid.
UPDATE public.organizations
SET name = 'GRCHECK', slug = 'grcheck', updated_at = now()
WHERE slug = 'checklists';

-- Ensure org exists if it didn't
INSERT INTO public.organizations (name, slug)
SELECT 'GRCHECK', 'grcheck'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'grcheck');

-- Link all current super_admins to GRCHECK as admin
WITH org AS (SELECT id FROM public.organizations WHERE slug = 'grcheck')
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT ur.user_id, org.id
FROM public.user_roles ur, org
WHERE ur.role = 'super_admin'
ON CONFLICT DO NOTHING;

WITH org AS (SELECT id FROM public.organizations WHERE slug = 'grcheck')
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT ur.user_id, org.id, 'admin'
FROM public.user_roles ur, org
WHERE ur.role = 'super_admin'
ON CONFLICT DO NOTHING;