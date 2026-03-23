
ALTER TABLE public.tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (status = ANY (ARRAY['Aberto'::text, 'Em Andamento'::text, 'Aguardando Aprovação'::text, 'Aprovado'::text, 'Fechado'::text]));
