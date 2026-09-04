ALTER TABLE public.op_award_tiers ADD COLUMN IF NOT EXISTS bonus_brl numeric NOT NULL DEFAULT 0;
UPDATE public.op_award_tiers SET bonus_brl = 300 WHERE label = 'Prata';
UPDATE public.op_award_tiers SET bonus_brl = 400 WHERE label = 'Ouro';