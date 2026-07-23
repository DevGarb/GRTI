
UPDATE auth.users
SET email = 'sedna.karla@grti.local',
    encrypted_password = crypt('mudar@123', gen_salt('bf')),
    updated_at = now()
WHERE id = '2519225c-8300-4c95-987e-2d3c05357b19';

UPDATE public.profiles
SET full_name = 'SEDNA KARLA',
    username = 'sedna.karla',
    email = 'sedna.karla@grti.local',
    updated_at = now()
WHERE user_id = '2519225c-8300-4c95-987e-2d3c05357b19';
