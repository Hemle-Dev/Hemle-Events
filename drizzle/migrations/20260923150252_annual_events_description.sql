-- Additive migration: no existing event, slug, description or image is rewritten.
ALTER TABLE public.events
  ADD COLUMN annuel boolean NOT NULL DEFAULT false,
  ADD COLUMN description_format text NOT NULL DEFAULT 'plain',
  ADD CONSTRAINT events_description_format_check CHECK (description_format IN ('plain', 'formatted')),
  ADD CONSTRAINT events_annual_single_day_check CHECK (NOT annuel OR date_fin IS NULL OR date_fin = date_debut);

CREATE FUNCTION public.next_event_annual_date(first_date date, reference_date date)
RETURNS date LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  y integer := greatest(extract(year FROM first_date)::integer, extract(year FROM reference_date)::integer);
  candidate date;
BEGIN
  LOOP
    BEGIN
      candidate := make_date(y, extract(month FROM first_date)::integer, extract(day FROM first_date)::integer);
      IF candidate >= first_date AND candidate >= reference_date THEN RETURN candidate; END IF;
    EXCEPTION WHEN datetime_field_overflow THEN
      -- A February 29 occurrence skips non-leap years.
      NULL;
    END;
    y := y + 1;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.next_event_annual_date(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_event_annual_date(date, date) TO anon, authenticated, service_role;

-- Keep the caller's RLS: anonymous users never see unpublished events through this view.
CREATE VIEW public.event_occurrences WITH (security_invoker = true) AS
SELECT e.*,
  CASE WHEN e.annuel THEN public.next_event_annual_date(e.date_debut, (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Douala')::date)
    ELSE e.date_debut END AS occurrence_start,
  CASE WHEN e.annuel THEN public.next_event_annual_date(e.date_debut, (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Douala')::date)
    ELSE e.date_fin_effective END AS occurrence_end
FROM public.events e;
GRANT SELECT ON public.event_occurrences TO anon, authenticated, service_role;

CREATE FUNCTION public.check_event_feature_date() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.mise_en_avant AND NOT NEW.annuel
     AND COALESCE(NEW.date_fin, NEW.date_debut) < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Douala')::date THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Un événement passé ne peut pas être mis à la une.' USING ERRCODE = '23514';
    ELSIF NOT OLD.mise_en_avant OR NEW.date_debut IS DISTINCT FROM OLD.date_debut
      OR NEW.date_fin IS DISTINCT FROM OLD.date_fin OR NEW.annuel IS DISTINCT FROM OLD.annuel THEN
      RAISE EXCEPTION 'Un événement passé ne peut pas être mis à la une.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_event_feature_date() FROM PUBLIC;
CREATE TRIGGER check_event_feature_date BEFORE INSERT OR UPDATE OF mise_en_avant, date_debut, date_fin, annuel
ON public.events FOR EACH ROW EXECUTE FUNCTION public.check_event_feature_date();

NOTIFY pgrst, 'reload schema';
