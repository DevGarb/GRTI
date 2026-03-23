ALTER TABLE public.preventive_maintenance
ADD COLUMN sector text NULL DEFAULT '',
ADD COLUMN responsible text NULL DEFAULT '';