CREATE UNIQUE INDEX IF NOT EXISTS tickets_org_number_unique
ON public.tickets (organization_id, ticket_number)
WHERE ticket_number IS NOT NULL;