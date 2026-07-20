ALTER TABLE public.op_mechanics ADD COLUMN IF NOT EXISTS pin text;
CREATE UNIQUE INDEX IF NOT EXISTS op_mechanics_org_pin_uniq ON public.op_mechanics(organization_id, pin) WHERE pin IS NOT NULL;