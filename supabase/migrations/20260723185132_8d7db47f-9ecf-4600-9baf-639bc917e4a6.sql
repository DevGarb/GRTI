
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 10 INCREMENT BY 1;
GRANT USAGE ON SEQUENCE public.ticket_number_seq TO authenticated, service_role;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_number integer;
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);

CREATE OR REPLACE FUNCTION public.reserve_ticket_number()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.ticket_number_seq')::integer;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_ticket_number() TO authenticated, service_role;
