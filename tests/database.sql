-- Execute ONLY on an empty disposable PostgreSQL database.
\set ON_ERROR_STOP on
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
\ir ../drizzle/migrations/0000_create_hemle_events_schema.sql
\ir ../drizzle/migrations/0001_add_date_fin_effective.sql
-- Legacy identifiers must survive migration safely.
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-0000-0000-000000000001','ADMIN@example.test'),
 ('00000000-0000-0000-0000-000000000002','editor@example.test'),
 ('00000000-0000-0000-0000-000000000003','x@example.test');
\ir ../drizzle/migrations/0002_secure_identifier_accounts.sql
\ir ../drizzle/migrations/0003_event_image_storage.sql
INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-000000000001','administrateur'),
 ('00000000-0000-0000-0000-000000000002','editeur');
INSERT INTO public.events(titre,slug,date_debut,pays,ville,statut)
VALUES ('Secret','test-secret',current_date,'Cameroun','Douala','brouillon');

CREATE TEMP TABLE events_before_features AS SELECT id, to_jsonb(e) AS value FROM public.events e;
\ir ../drizzle/migrations/20260923150252_annual_events_description.sql
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM events_before_features old LEFT JOIN public.events e USING(id)
   WHERE e.id IS NULL OR (to_jsonb(e) - 'annuel' - 'description_format') IS DISTINCT FROM old.value) THEN
   RAISE EXCEPTION 'Existing event changed during additive migration';
 END IF;
 IF EXISTS (SELECT 1 FROM public.events WHERE annuel OR description_format <> 'plain') THEN
   RAISE EXCEPTION 'Legacy event unexpectedly converted';
 END IF;
 IF public.next_event_annual_date('2020-09-22','2026-09-23') <> '2027-09-22' THEN RAISE EXCEPTION 'Annual rollover'; END IF;
 IF public.next_event_annual_date('2020-09-23','2026-09-23') <> '2026-09-23' THEN RAISE EXCEPTION 'Annual today'; END IF;
 IF public.next_event_annual_date('2024-02-29','2026-09-23') <> '2028-02-29' THEN RAISE EXCEPTION 'Leap year'; END IF;
 IF public.next_event_annual_date('2030-01-01','2026-09-23') <> '2030-01-01' THEN RAISE EXCEPTION 'First edition'; END IF;
 INSERT INTO public.events(titre,slug,date_debut,pays,ville,statut,annuel)
 VALUES ('Annual','test-annual','2020-01-01','CM','Douala','publie',true);
 IF NOT EXISTS (SELECT 1 FROM public.event_occurrences WHERE slug='test-annual' AND occurrence_start >= current_date) THEN RAISE EXCEPTION 'Annual missing from agenda'; END IF;
 BEGIN
   INSERT INTO public.events(titre,slug,date_debut,date_fin,pays,ville,annuel) VALUES ('Bad annual','bad-annual','2020-01-01','2020-01-02','CM','Douala',true);
   RAISE EXCEPTION 'Multi-day annual accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 INSERT INTO public.events(titre,slug,date_debut,pays,ville) VALUES ('Past','test-past',current_date - 10,'CM','Douala');
 BEGIN
   UPDATE public.events SET mise_en_avant=true WHERE slug='test-past';
   RAISE EXCEPTION 'Past event featured';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 UPDATE public.events SET mise_en_avant=true WHERE slug='test-annual';
END $$;

CREATE TEMP TABLE events_before_audience AS SELECT id, to_jsonb(e) AS value FROM public.events e;
\ir ../drizzle/migrations/20260924121227_editorial_event_audience.sql
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM events_before_audience old LEFT JOIN public.events e USING(id)
   WHERE e.id IS NULL OR e.audience IS NOT NULL OR (to_jsonb(e) - 'audience') IS DISTINCT FROM old.value) THEN
   RAISE EXCEPTION 'Editorial migration modified legacy events';
 END IF;
 BEGIN
   UPDATE public.events SET audience='europe' WHERE slug='test-annual';
   RAISE EXCEPTION 'Invalid editorial audience accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.events SET audience='diaspora' WHERE slug='test-annual';
 IF NOT EXISTS (SELECT 1 FROM public.event_occurrences WHERE slug='test-annual' AND audience='diaspora' AND pays='CM') THEN
   RAISE EXCEPTION 'Editorial choice incorrectly constrained by geography';
 END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.events WHERE slug='test-secret') THEN
   RAISE EXCEPTION 'Anonymous read leaked draft';
 END IF;
 IF EXISTS (SELECT 1 FROM public.event_occurrences WHERE slug='test-secret') THEN
   RAISE EXCEPTION 'View leaked draft';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.event_occurrences WHERE audience='diaspora' AND slug='test-annual') THEN
   RAISE EXCEPTION 'Anonymous editorial filter hides published event';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.event_occurrences WHERE slug='test-annual') THEN
   RAISE EXCEPTION 'View hides published annual';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.events WHERE statut='publie') THEN
   RAISE EXCEPTION 'Public events not visible';
 END IF;
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug='test-secret') THEN
   RAISE EXCEPTION 'Editor cannot read draft';
 END IF;
 IF public.has_role('00000000-0000-0000-0000-000000000001','administrateur') THEN
   RAISE EXCEPTION 'Role helper accepts impersonation';
 END IF;
 UPDATE public.profiles SET actif=false WHERE id=auth.uid();
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT actif) THEN
   RAISE EXCEPTION 'Self profile update permitted';
 END IF;
 BEGIN
   INSERT INTO public.user_roles(user_id,role) VALUES (auth.uid(),'administrateur');
   RAISE EXCEPTION 'Self privilege escalation permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
UPDATE public.profiles SET actif=false WHERE id='00000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
DO $$ BEGIN
 IF public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Inactive staff accepted'; END IF;
 IF EXISTS (SELECT 1 FROM public.events WHERE slug='test-secret') THEN
   RAISE EXCEPTION 'Inactive user reads draft';
 END IF;
 BEGIN
   INSERT INTO public.events(titre,slug,date_debut,pays,ville) VALUES ('Denied','denied',current_date,'CM','Douala');
   RAISE EXCEPTION 'Inactive user inserts event';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO $$ BEGIN
 IF NOT public.has_role(auth.uid(),'administrateur') THEN RAISE EXCEPTION 'Admin missing'; END IF;
 UPDATE public.profiles SET actif=true WHERE id='00000000-0000-0000-0000-000000000002';
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000002' AND actif) THEN
   RAISE EXCEPTION 'Admin cannot reactivate user';
 END IF;
END $$;
RESET ROLE;
SELECT 'RLS tests passed' AS result;
