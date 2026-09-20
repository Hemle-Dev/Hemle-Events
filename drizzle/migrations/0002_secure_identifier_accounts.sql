-- Harden staff access and switch profiles to identifier-based accounts.

UPDATE public.profiles
SET identifiant = CASE
  WHEN lower(btrim(identifiant)) ~ '^[a-z0-9][a-z0-9._-]{2,47}$' THEN lower(btrim(identifiant))
  ELSE 'compte-' || replace(id::text, '-', '')
END;

WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY lower(identifiant) ORDER BY created_at, id) AS position
  FROM public.profiles
)
UPDATE public.profiles p
SET identifiant = 'compte-' || replace(p.id::text, '-', '')
FROM duplicates d
WHERE p.id = d.id AND d.position > 1;

ALTER TABLE public.profiles
  ALTER COLUMN identifiant SET NOT NULL,
  ADD CONSTRAINT profiles_identifiant_format_check
    CHECK (identifiant ~ '^[a-z0-9][a-z0-9._-]{2,47}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_identifiant_unique_idx
  ON public.profiles (lower(identifiant));

-- Users may no longer edit their own profile. Profile and account management
-- are reserved for administrators through trusted server functions.
DROP POLICY IF EXISTS "profiles readable by staff" ON public.profiles;
CREATE POLICY "profiles readable by owner or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'administrateur'));

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "admin updates profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'administrateur'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'administrateur'));

DROP POLICY IF EXISTS "admin inserts profiles" ON public.profiles;
CREATE POLICY "admin inserts profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'administrateur'));

DROP POLICY IF EXISTS "roles readable by staff" ON public.user_roles;
CREATE POLICY "roles readable by owner or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'administrateur'));

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE _user_id = (SELECT auth.uid())
      AND ur.user_id = _user_id
      AND ur.role = _role
      AND p.actif = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE _user_id = (SELECT auth.uid())
      AND ur.user_id = _user_id
      AND p.actif = true
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Role responsibilities: editors manage content, moderators may validate it,
-- and administrators retain full control.
DROP POLICY IF EXISTS "categories staff write" ON public.categories;
CREATE POLICY "categories editors write" ON public.categories FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'administrateur')
    OR public.has_role((SELECT auth.uid()), 'editeur')
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'administrateur')
    OR public.has_role((SELECT auth.uid()), 'editeur')
  );

DROP POLICY IF EXISTS "events staff insert" ON public.events;
DROP POLICY IF EXISTS "events staff update" ON public.events;
CREATE POLICY "events editors insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'administrateur')
    OR public.has_role((SELECT auth.uid()), 'editeur')
  );
CREATE POLICY "events staff update" ON public.events FOR UPDATE TO authenticated
  USING (public.is_staff((SELECT auth.uid())))
  WITH CHECK (public.is_staff((SELECT auth.uid())));

-- Never accidentally publish an event with an incomplete schedule.
UPDATE public.events SET statut = 'brouillon'
WHERE statut = 'programme' AND published_at IS NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_date_order_check CHECK (date_fin IS NULL OR date_fin >= date_debut),
  ADD CONSTRAINT events_programme_date_check CHECK (statut <> 'programme' OR published_at IS NOT NULL);
