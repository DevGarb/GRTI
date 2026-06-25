
CREATE OR REPLACE FUNCTION public.get_mvp_evolution_v2(
  _organization_id uuid,
  _track text,
  _months_back integer DEFAULT 6
)
RETURNS TABLE(
  year integer,
  month integer,
  label text,
  avg_final numeric,
  avg_on_time numeric,
  avg_rework numeric,
  total_deliveries bigint,
  total_value numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  cur_date date := date_trunc('month', now())::date;
  ref_year integer;
  ref_month integer;
  rec record;
BEGIN
  FOR i IN REVERSE (_months_back - 1)..0 LOOP
    ref_year := EXTRACT(YEAR FROM (cur_date - (i || ' months')::interval))::integer;
    ref_month := EXTRACT(MONTH FROM (cur_date - (i || ' months')::interval))::integer;

    IF _track = 'chamados' THEN
      SELECT
        COALESCE(AVG(m.final_score), 0)::numeric AS f,
        COALESCE(AVG(m.on_time_rate), 0)::numeric AS o,
        COALESCE(AVG(m.rework_rate), 0)::numeric AS r,
        COALESCE(SUM(m.total_closed), 0)::bigint AS d,
        0::numeric AS v
      INTO rec
      FROM public.get_mvp_chamados_metrics(_organization_id, ref_year, ref_month) m;
    ELSE
      SELECT
        COALESCE(AVG(m.final_score), 0)::numeric AS f,
        COALESCE(AVG(m.on_time_rate), 0)::numeric AS o,
        COALESCE(AVG(m.rework_rate), 0)::numeric AS r,
        COALESCE(SUM(m.total_deliveries), 0)::bigint AS d,
        COALESCE(SUM(m.amount_brl), 0)::numeric AS v
      INTO rec
      FROM public.get_mvp_metrics(_organization_id, ref_year, ref_month) m;
    END IF;

    year := ref_year;
    month := ref_month;
    label := to_char(make_date(ref_year, ref_month, 1), 'TMMon/YY');
    avg_final := ROUND(rec.f, 1);
    avg_on_time := ROUND(rec.o, 1);
    avg_rework := ROUND(rec.r, 1);
    total_deliveries := rec.d;
    total_value := ROUND(rec.v, 2);
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mvp_evolution_v2(uuid, text, integer) TO authenticated, service_role;
