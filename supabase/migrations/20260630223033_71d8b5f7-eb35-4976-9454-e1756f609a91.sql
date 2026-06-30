REVOKE EXECUTE ON FUNCTION public.get_metas_tecnicos(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_metas_tecnicos(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_metas_tecnicos(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metas_tecnicos(integer, integer) TO service_role;