
CREATE TABLE public.user_todo_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id uuid NOT NULL REFERENCES public.user_todos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_todo_comments_todo ON public.user_todo_comments(todo_id);

ALTER TABLE public.user_todo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comments if can view todo"
  ON public.user_todo_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_todos t
      WHERE t.id = todo_id
        AND (
          t.user_id = auth.uid()
          OR is_super_admin(auth.uid())
          OR (
            is_same_organization(t.organization_id)
            AND is_staff_user(auth.uid())
            AND is_staff_user(t.user_id)
          )
        )
    )
  );

CREATE POLICY "Insert comments if can view todo"
  ON public.user_todo_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_todos t
      WHERE t.id = todo_id
        AND (
          t.user_id = auth.uid()
          OR is_super_admin(auth.uid())
          OR (
            is_same_organization(t.organization_id)
            AND is_staff_user(auth.uid())
            AND is_staff_user(t.user_id)
          )
        )
    )
  );

CREATE POLICY "Update own comments"
  ON public.user_todo_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own comments or super admin"
  ON public.user_todo_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE TRIGGER update_user_todo_comments_updated_at
  BEFORE UPDATE ON public.user_todo_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History table for tracking changes on todos
CREATE TABLE public.user_todo_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id uuid NOT NULL REFERENCES public.user_todos(id) ON DELETE CASCADE,
  user_id uuid,
  field text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_todo_history_todo ON public.user_todo_history(todo_id);

ALTER TABLE public.user_todo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history if can view todo"
  ON public.user_todo_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_todos t
      WHERE t.id = todo_id
        AND (
          t.user_id = auth.uid()
          OR is_super_admin(auth.uid())
          OR (
            is_same_organization(t.organization_id)
            AND is_staff_user(auth.uid())
            AND is_staff_user(t.user_id)
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.log_user_todo_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.user_todo_history(todo_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, actor, 'title', OLD.title, NEW.title);
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.user_todo_history(todo_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, actor, 'description', OLD.description, NEW.description);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.user_todo_history(todo_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, actor, 'status', OLD.status, NEW.status);
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.user_todo_history(todo_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, actor, 'priority', OLD.priority, NEW.priority);
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.user_todo_history(todo_id, user_id, field, old_value, new_value)
    VALUES (NEW.id, actor, 'due_date', OLD.due_date::text, NEW.due_date::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_user_todo_changes_trigger
  AFTER UPDATE ON public.user_todos
  FOR EACH ROW EXECUTE FUNCTION public.log_user_todo_changes();
