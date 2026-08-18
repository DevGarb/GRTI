CREATE OR REPLACE FUNCTION public.notify_oficina_analise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-oficina-analise',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'os_number', NEW.os_number,
      'vehicle_plate', NEW.vehicle_plate,
      'vehicle_model', NEW.vehicle_model,
      'customer_name', NEW.customer_name,
      'description', NEW.description,
      'company_id', NEW.company_id,
      'stage', NEW.stage,
      'opened_at', NEW.opened_at,
      'created_at', NEW.created_at
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_oficina_analise_ins ON public.op_service_orders;
CREATE TRIGGER trg_notify_oficina_analise_ins
AFTER INSERT ON public.op_service_orders
FOR EACH ROW
WHEN (coalesce(NEW.stage, 'analise') = 'analise')
EXECUTE FUNCTION public.notify_oficina_analise();

DROP TRIGGER IF EXISTS trg_notify_oficina_analise_upd ON public.op_service_orders;
CREATE TRIGGER trg_notify_oficina_analise_upd
AFTER UPDATE OF stage ON public.op_service_orders
FOR EACH ROW
WHEN (NEW.stage = 'analise' AND coalesce(OLD.stage, '') IS DISTINCT FROM 'analise')
EXECUTE FUNCTION public.notify_oficina_analise();