ALTER TABLE public.user_todos DROP CONSTRAINT IF EXISTS user_todos_priority_chk;
ALTER TABLE public.user_todos ADD CONSTRAINT user_todos_priority_chk CHECK (priority IN ('baixa','media','alta','sem'));
ALTER TABLE public.user_todos ADD COLUMN IF NOT EXISTS eisenhower_quadrant smallint;
ALTER TABLE public.user_todos ADD CONSTRAINT user_todos_quadrant_chk CHECK (eisenhower_quadrant IS NULL OR eisenhower_quadrant BETWEEN 1 AND 4);