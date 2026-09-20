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

SET ROLE anon;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.events WHERE slug='test-secret') THEN
   RAISE EXCEPTION 'Anonymous read leaked draft';
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
