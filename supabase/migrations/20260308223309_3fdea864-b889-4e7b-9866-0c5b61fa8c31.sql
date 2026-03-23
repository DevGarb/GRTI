
-- Fix tickets policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins and technicians can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

CREATE POLICY "Authenticated users can view tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins and technicians can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico'));
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix organizations policies
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can update any organization" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON public.organizations;

CREATE POLICY "Users can view organizations" ON public.organizations FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid())
);
CREATE POLICY "Admins can insert organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update their organization" ON public.organizations FOR UPDATE TO authenticated USING (
  public.is_super_admin(auth.uid()) OR (id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'))
);
CREATE POLICY "Super admins can delete organizations" ON public.organizations FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Fix subscription_plans policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Super admins can manage plans" ON public.subscription_plans;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can insert plans" ON public.subscription_plans FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update plans" ON public.subscription_plans FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete plans" ON public.subscription_plans FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix other tables
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;

CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert own audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Users can create evaluations" ON public.evaluations;

CREATE POLICY "Authenticated users can view evaluations" ON public.evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create evaluations" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage intervals" ON public.maintenance_intervals;
DROP POLICY IF EXISTS "Authenticated users can view intervals" ON public.maintenance_intervals;

CREATE POLICY "Authenticated users can view intervals" ON public.maintenance_intervals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage intervals" ON public.maintenance_intervals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Technicians and admins can create maintenance" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Technicians and admins can update maintenance" ON public.preventive_maintenance;

CREATE POLICY "Authenticated users can view maintenance" ON public.preventive_maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Technicians and admins can create maintenance" ON public.preventive_maintenance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico'));
CREATE POLICY "Technicians and admins can update maintenance" ON public.preventive_maintenance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico'));

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.ticket_attachments;
DROP POLICY IF EXISTS "Users can add attachments to their tickets" ON public.ticket_attachments;

CREATE POLICY "Authenticated users can view attachments" ON public.ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add attachments" ON public.ticket_attachments FOR INSERT TO authenticated WITH CHECK (
  ticket_id IN (SELECT id FROM tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico')
);

DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_logs;

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
