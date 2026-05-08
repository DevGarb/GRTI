
-- Closure fields
ALTER TABLE public.op_deliveries
  ADD COLUMN IF NOT EXISTS closure_summary text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS closure_summary text,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

ALTER TABLE public.op_maintenance_orders
  ADD COLUMN IF NOT EXISTS closure_summary text,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

-- Notes / mentions table
CREATE TABLE IF NOT EXISTS public.op_card_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('delivery','service_order','maintenance')),
  card_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  mentioned_users uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_card_notes_card ON public.op_card_notes (module, card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_op_card_notes_org ON public.op_card_notes (organization_id);

ALTER TABLE public.op_card_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View org card notes"
  ON public.op_card_notes FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_same_organization(organization_id));

CREATE POLICY "Staff insert card notes"
  ON public.op_card_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_super_admin(auth.uid())
      OR (
        public.is_same_organization(organization_id)
        AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'tecnico'::app_role))
      )
    )
  );

CREATE POLICY "Author deletes own note"
  ON public.op_card_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_super_admin(auth.uid()));
