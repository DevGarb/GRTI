
CREATE POLICY "Auditors can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'auditor'::public.app_role));
