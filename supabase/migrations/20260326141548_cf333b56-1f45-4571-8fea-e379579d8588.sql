-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add desenvolvedor to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'desenvolvedor';

-- Update existing super admin profiles to have username
UPDATE public.profiles SET username = 'ti.coordenador' WHERE email = 'ti.coordenador@ramosgrupo.com.br';
UPDATE public.profiles SET username = 'danilo.souza' WHERE email = 'danilosouza4040@gmail.com';