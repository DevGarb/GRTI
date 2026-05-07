-- Add organization_id to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid;
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- Trigger to auto-fill organization_id from caller's profile if not provided
CREATE OR REPLACE FUNCTION public.audit_logs_set_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_set_org ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_set_org
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_logs_set_org();

-- Tighten RLS: admins see only own-org logs; auditors and super_admins see all
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view org audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    is_super_admin(auth.uid())
    OR organization_id IS NULL
    OR is_same_organization(organization_id)
  )
);