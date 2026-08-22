ALTER TABLE public.op_award_tiers ADD COLUMN IF NOT EXISTS label text;

UPDATE public.op_award_tiers
SET label = CASE position
  WHEN 1 THEN 'Bronze'
  WHEN 2 THEN 'Prata'
  WHEN 3 THEN 'Ouro'
  ELSE 'Faixa ' || position
END
WHERE label IS NULL OR label = '';

ALTER TABLE public.op_award_tiers ALTER COLUMN label SET NOT NULL;