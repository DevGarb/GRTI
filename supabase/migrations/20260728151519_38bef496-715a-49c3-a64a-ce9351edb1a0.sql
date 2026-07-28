ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'analise',
  ADD COLUMN IF NOT EXISTS parts_arrived_at date,
  ADD COLUMN IF NOT EXISTS kanban_position integer NOT NULL DEFAULT 0;

ALTER TABLE public.op_service_order_parts
  ADD COLUMN IF NOT EXISTS part_status text NOT NULL DEFAULT 'solicitada',
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.op_service_orders SET stage = CASE
  WHEN status = 'Aguardando peças' THEN 'aguardando_peca'
  WHEN status = 'Em andamento' THEN 'execucao'
  WHEN status = 'Finalizado' THEN 'entregue'
  ELSE 'analise' END
WHERE stage = 'analise';