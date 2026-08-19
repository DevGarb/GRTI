CREATE OR REPLACE FUNCTION public.notify_supervisor_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-supervisor-alert',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'os_number', NEW.os_number,
      'vehicle_plate', NEW.vehicle_plate,
      'vehicle_model', NEW.vehicle_model,
      'customer_name', NEW.customer_name,
      'company_id', NEW.company_id,
      'mechanic_id', NEW.mechanic_id,
      'supervisor_alert_reason', NEW.supervisor_alert_reason,
      'supervisor_alert_note', NEW.supervisor_alert_note,
      'supervisor_alert_at', NEW.supervisor_alert_at
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supervisor_alert_ins ON public.op_service_orders;
CREATE TRIGGER trg_notify_supervisor_alert_ins
AFTER INSERT ON public.op_service_orders
FOR EACH ROW
WHEN (NEW.supervisor_alert IS TRUE)
EXECUTE FUNCTION public.notify_supervisor_alert();

DROP TRIGGER IF EXISTS trg_notify_supervisor_alert_upd ON public.op_service_orders;
CREATE TRIGGER trg_notify_supervisor_alert_upd
AFTER UPDATE ON public.op_service_orders
FOR EACH ROW
WHEN (NEW.supervisor_alert IS TRUE AND (OLD.supervisor_alert IS DISTINCT FROM TRUE OR OLD.supervisor_alert_at IS DISTINCT FROM NEW.supervisor_alert_at))
EXECUTE FUNCTION public.notify_supervisor_alert();