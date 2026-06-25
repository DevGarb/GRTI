REVOKE ALL ON FUNCTION public.invalidate_ticket_rework(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invalidate_ticket_rework(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.invalidate_ticket_rework(uuid, text) TO authenticated;