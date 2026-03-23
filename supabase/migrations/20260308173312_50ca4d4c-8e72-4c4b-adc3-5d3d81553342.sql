
CREATE TABLE public.maintenance_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type text NOT NULL UNIQUE,
  interval_days integer NOT NULL DEFAULT 90,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_intervals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intervals" ON public.maintenance_intervals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage intervals" ON public.maintenance_intervals
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default values
INSERT INTO public.maintenance_intervals (equipment_type, interval_days) VALUES
  ('Desktop', 90),
  ('Notebook', 90),
  ('Impressora', 90),
  ('Servidor', 60);
