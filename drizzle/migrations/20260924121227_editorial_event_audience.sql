-- Editorial choice: do not infer existing classifications from geography.
-- NULL preserves legacy events until a staff member classifies them.
ALTER TABLE public.events ADD COLUMN audience text
  CONSTRAINT events_audience_check CHECK (audience IN ('afrique', 'diaspora'));
CREATE INDEX events_audience_date_idx ON public.events (audience, date_debut);

-- Append to the existing view without changing its columns' order or grants.
-- Re-expanding e.* would insert audience before occurrence_start and fail.
DO $$
DECLARE columns_sql text;
BEGIN
  SELECT string_agg(format('e.%I', attname), ', ' ORDER BY attnum)
    INTO columns_sql FROM pg_attribute
    WHERE attrelid = 'public.events'::regclass AND attnum > 0 AND NOT attisdropped AND attname <> 'audience';
  EXECUTE format($view$
    CREATE OR REPLACE VIEW public.event_occurrences WITH (security_invoker = true) AS
    SELECT %s,
      CASE WHEN e.annuel THEN public.next_event_annual_date(e.date_debut, (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Douala')::date)
        ELSE e.date_debut END AS occurrence_start,
      CASE WHEN e.annuel THEN public.next_event_annual_date(e.date_debut, (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Douala')::date)
        ELSE e.date_fin_effective END AS occurrence_end,
      e.audience
    FROM public.events e
  $view$, columns_sql);
END;
$$;
NOTIFY pgrst, 'reload schema';
