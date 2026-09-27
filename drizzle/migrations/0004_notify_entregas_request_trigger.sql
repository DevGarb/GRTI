CREATE OR REPLACE FUNCTION public.notify_entregas_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-entregas',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_entregas ON public.op_deliveries;

CREATE TRIGGER trg_notify_entregas
AFTER INSERT ON public.op_deliveries
FOR EACH ROW
WHEN (NEW.status = 'Pendente')
EXECUTE FUNCTION public.notify_entregas_request();