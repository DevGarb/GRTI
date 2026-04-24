
-- Habilitar realtime para a tabela tickets (atualização ao vivo do SLA Timer)
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets';
  END IF;
END $$;
