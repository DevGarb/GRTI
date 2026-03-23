
-- Table for manual performance goals
CREATE TABLE public.performance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' or 'sector'
  target_id TEXT NOT NULL, -- user_id for individual, sector name for sector
  target_label TEXT NOT NULL DEFAULT '', -- display name (person or sector name)
  metric TEXT NOT NULL, -- 'tickets_closed', 'avg_score', 'avg_resolution_hours', 'points'
  target_value NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  reference_month INTEGER, -- 1-12, null for non-monthly
  reference_year INTEGER NOT NULL DEFAULT 2026,
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage goals" ON public.performance_goals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view goals" ON public.performance_goals
  FOR SELECT TO authenticated
  USING (true);
