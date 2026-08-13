CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_unassigned_maint_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-maint-order',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'om_number', NEW.om_number,
      'title', NEW.title,
      'description', NEW.description,
      'category', NEW.category,
      'priority', NEW.priority,
      'site_id', NEW.site_id,
      'responsible', NEW.responsible,
      'assigned_technician_id', NEW.assigned_technician_id,
      'opened_at', NEW.opened_at,
      'created_at', NEW.created_at
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_unassigned_maint_order ON public.op_maintenance_orders;

CREATE TRIGGER trg_notify_unassigned_maint_order
AFTER INSERT ON public.op_maintenance_orders
FOR EACH ROW
WHEN (NEW.assigned_technician_id IS NULL AND coalesce(NEW.responsible, '') = '')
EXECUTE FUNCTION public.notify_unassigned_maint_order();