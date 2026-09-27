CREATE OR REPLACE FUNCTION public.notify_unassigned_maint_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _event text := 'new_order';
  _new_items jsonb := '[]'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(jsonb_agg(n), '[]'::jsonb) INTO _new_items
    FROM jsonb_array_elements(coalesce(NEW.materials, '[]'::jsonb)) n
    WHERE NOT (coalesce(OLD.materials, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('name', n->'name')));
    IF jsonb_array_length(_new_items) = 0 THEN RETURN NEW; END IF;
    _event := 'new_material';
  END IF;
  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-maint-order',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event', _event, 'new_materials', _new_items, 'record', jsonb_build_object(
      'id', NEW.id, 'om_number', NEW.om_number, 'title', NEW.title, 'description', NEW.description,
      'category', NEW.category, 'priority', NEW.priority, 'site_id', NEW.site_id,
      'responsible', NEW.responsible, 'assigned_technician_id', NEW.assigned_technician_id,
      'materials', NEW.materials, 'opened_at', NEW.opened_at, 'created_at', NEW.created_at))
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_unassigned_maint_order ON public.op_maintenance_orders;
CREATE TRIGGER trg_notify_unassigned_maint_order
AFTER INSERT ON public.op_maintenance_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_unassigned_maint_order();

DROP TRIGGER IF EXISTS trg_notify_maint_materials ON public.op_maintenance_orders;
CREATE TRIGGER trg_notify_maint_materials
AFTER UPDATE OF materials ON public.op_maintenance_orders
FOR EACH ROW WHEN (NEW.materials IS DISTINCT FROM OLD.materials)
EXECUTE FUNCTION public.notify_unassigned_maint_order();