
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'satisfaction';

-- Update existing evaluations: if score <= 5, likely a meta evaluation
UPDATE public.evaluations SET type = 'meta' WHERE score <= 5;
UPDATE public.evaluations SET type = 'satisfaction' WHERE score > 5;
