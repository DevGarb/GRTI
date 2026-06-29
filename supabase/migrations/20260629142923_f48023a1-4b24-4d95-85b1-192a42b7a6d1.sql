
UPDATE public.tickets t
SET started_at = sub.first_started
FROM (
  SELECT ticket_id, MIN(created_at) AS first_started
  FROM public.ticket_history
  WHERE action = 'status_change' AND new_value = 'Em Andamento'
  GROUP BY ticket_id
) sub
WHERE t.id = sub.ticket_id AND t.started_at IS NULL;

UPDATE public.tickets t
SET started_at = t.created_at
WHERE t.started_at IS NULL
  AND t.status IN ('Em Andamento','Aguardando Aprovação','Aprovado','Fechado','Resolvido');
