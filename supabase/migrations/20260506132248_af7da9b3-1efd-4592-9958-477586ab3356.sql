
CREATE TABLE public.user_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendente',
  due_date date,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_todos_priority_chk CHECK (priority IN ('baixa','media','alta')),
  CONSTRAINT user_todos_status_chk CHECK (status IN ('pendente','andamento','concluido'))
);

CREATE INDEX idx_user_todos_user ON public.user_todos(user_id);
CREATE INDEX idx_user_todos_org ON public.user_todos(organization_id);

ALTER TABLE public.user_todos ENABLE ROW LEVEL SECURITY;

-- Helper: check if a given user has a "staff" role (admin/tecnico/desenvolvedor)
CREATE OR REPLACE FUNCTION public.is_staff_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'tecnico'::app_role, 'desenvolvedor'::app_role, 'super_admin'::app_role)
  )
$$;

CREATE POLICY "Users can view own todos or staff cross-view"
  ON public.user_todos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin(auth.uid())
    OR (
      is_same_organization(organization_id)
      AND is_staff_user(auth.uid())
      AND is_staff_user(user_id)
    )
  );

CREATE POLICY "Users can insert own todos"
  ON public.user_todos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own todos"
  ON public.user_todos FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY "Users can delete own todos"
  ON public.user_todos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE TRIGGER update_user_todos_updated_at
  BEFORE UPDATE ON public.user_todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
