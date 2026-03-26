
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, full_name, email, username, phone)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', ''),
  email,
  COALESCE(raw_user_meta_data->>'username', NULL),
  NULL
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'solicitante'
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_roles);
