
-- Create patrimonio (assets) table
CREATE TABLE public.patrimonio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_tag TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  serial_number TEXT DEFAULT '',
  sector TEXT DEFAULT '',
  responsible TEXT DEFAULT '',
  location TEXT DEFAULT '',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view patrimonio"
  ON public.patrimonio FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Technicians and admins can insert patrimonio"
  ON public.patrimonio FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Technicians and admins can update patrimonio"
  ON public.patrimonio FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Admins can delete patrimonio"
  ON public.patrimonio FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_patrimonio_updated_at
  BEFORE UPDATE ON public.patrimonio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
