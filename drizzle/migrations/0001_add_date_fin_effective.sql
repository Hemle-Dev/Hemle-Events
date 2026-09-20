ALTER TABLE public.events
  ADD COLUMN date_fin_effective date GENERATED ALWAYS AS (COALESCE(date_fin, date_debut)) STORED;
CREATE INDEX events_date_fin_effective_idx ON public.events (date_fin_effective);