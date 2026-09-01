ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS external_url text;

INSERT INTO public.organizations (name, slug, external_url)
SELECT 'Grupo Ramos - Gestão de Processos', 'gestao-processos', 'https://processosgr.lovable.app/'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'gestao-processos');

INSERT INTO public.user_organizations (user_id, organization_id)
SELECT p.user_id, o.id
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE o.slug = 'gestao-processos'
ON CONFLICT DO NOTHING;