
-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT 5,
  max_tickets_month integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add plan_id to organizations
ALTER TABLE public.organizations ADD COLUMN plan_id uuid REFERENCES public.subscription_plans(id);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can manage plans
CREATE POLICY "Super admins can manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow super_admin to view ALL organizations (for plan assignment)
CREATE POLICY "Super admins can view all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Allow super_admin to update any organization (for plan assignment)
CREATE POLICY "Super admins can update any organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
