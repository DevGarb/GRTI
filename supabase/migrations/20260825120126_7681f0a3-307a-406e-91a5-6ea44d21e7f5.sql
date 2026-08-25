CREATE TABLE public.op_card_moves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  module text NOT NULL,
  card_id uuid NOT NULL,
  from_column text,
  to_column text NOT NULL,
  moved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_op_card_moves_card ON public.op_card_moves (module, card_id, created_at DESC);

GRANT SELECT, INSERT ON public.op_card_moves TO authenticated;
GRANT ALL ON public.op_card_moves TO service_role;

ALTER TABLE public.op_card_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view card moves"
ON public.op_card_moves FOR SELECT TO authenticated
USING (public.is_member_of_org(organization_id));

CREATE POLICY "Org members can insert card moves"
ON public.op_card_moves FOR INSERT TO authenticated
WITH CHECK (public.is_member_of_org(organization_id));

CREATE OR REPLACE FUNCTION public.op_log_card_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module text := TG_ARGV[0];
  _col text := TG_ARGV[1];
  _old text;
  _new text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', _col, _col)
    INTO _old, _new USING OLD, NEW;
  IF _old IS DISTINCT FROM _new THEN
    INSERT INTO public.op_card_moves (organization_id, module, card_id, from_column, to_column, moved_by)
    VALUES (NEW.organization_id, _module, NEW.id, _old, _new, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_op_log_move_service_order
AFTER UPDATE ON public.op_service_orders
FOR EACH ROW EXECUTE FUNCTION public.op_log_card_move('service_order', 'stage');

CREATE TRIGGER trg_op_log_move_delivery
AFTER UPDATE ON public.op_deliveries
FOR EACH ROW EXECUTE FUNCTION public.op_log_card_move('delivery', 'status');

CREATE TRIGGER trg_op_log_move_maintenance
AFTER UPDATE ON public.op_maintenance_orders
FOR EACH ROW EXECUTE FUNCTION public.op_log_card_move('maintenance', 'status');