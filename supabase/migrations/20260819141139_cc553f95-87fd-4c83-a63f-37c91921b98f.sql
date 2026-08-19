CREATE OR REPLACE FUNCTION public.notify_oficina_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pendente' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pendente' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://gtimcognsszzsfpavups.supabase.co/functions/v1/notify-oficina-agendamento',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object(
      'id', NEW.id,
      'vehicle_plate', NEW.vehicle_plate,
      'vehicle_model', NEW.vehicle_model,
      'service_type', NEW.service_type,
      'description', NEW.description,
      'preferred_date', NEW.preferred_date,
      'preferred_period', NEW.preferred_period,
      'requester_name', NEW.requester_name,
      'status', NEW.status,
      'created_at', NEW.created_at
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_oficina_agendamento_ins ON public.op_workshop_bookings;
CREATE TRIGGER trg_notify_oficina_agendamento_ins
AFTER INSERT ON public.op_workshop_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_oficina_agendamento();

DROP TRIGGER IF EXISTS trg_notify_oficina_agendamento_upd ON public.op_workshop_bookings;
CREATE TRIGGER trg_notify_oficina_agendamento_upd
AFTER UPDATE OF status ON public.op_workshop_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_oficina_agendamento();