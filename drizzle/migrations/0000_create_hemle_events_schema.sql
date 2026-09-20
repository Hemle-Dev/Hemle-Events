-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('administrateur', 'editeur', 'moderateur');
CREATE TYPE public.event_status AS ENUM ('brouillon', 'programme', 'publie', 'suspendu', 'archive');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text,
  prenom text,
  email text,
  identifiant text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "profiles readable by staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "admin inserts profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'administrateur'));
CREATE POLICY "admin deletes profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "roles readable by staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- CATEGORIES ----------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories staff write" ON public.categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- EVENTS --------------------------------------------------------------
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  image_alt text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  date_debut date NOT NULL,
  heure_debut time,
  date_fin date,
  heure_fin time,
  pays text NOT NULL,
  ville text NOT NULL,
  lieu text,
  organisateur text,
  organisateur_description text,
  lien_inscription text,
  site_web text,
  reseaux_sociaux jsonb NOT NULL DEFAULT '{}'::jsonb,
  mots_cles text[] NOT NULL DEFAULT '{}',
  type_evenement text,
  statut public.event_status NOT NULL DEFAULT 'brouillon',
  mise_en_avant boolean NOT NULL DEFAULT false,
  demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX events_statut_date_idx ON public.events (statut, date_debut);
CREATE INDEX events_slug_idx ON public.events (slug);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events public read published" ON public.events FOR SELECT TO anon, authenticated
  USING (statut = 'publie' OR (statut = 'programme' AND published_at IS NOT NULL AND published_at <= now()));
CREATE POLICY "events staff read all" ON public.events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "events staff insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "events staff update" ON public.events FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "events admin delete" ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, identifiant)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nom', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'prenom', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED CATEGORIES -----------------------------------------------------
INSERT INTO public.categories (nom, slug, ordre) VALUES
  ('Culture','culture',1),('Business','business',2),('Entrepreneuriat','entrepreneuriat',3),
  ('Formation','formation',4),('Conférence','conference',5),('Salon','salon',6),
  ('Festival','festival',7),('Association','association',8),('Institution','institution',9),
  ('Sport','sport',10),('Mode','mode',11),('Art','art',12),('Musique','musique',13),
  ('Communauté','communaute',14),('Autres','autres',15);

-- SEED DEMO EVENTS ----------------------------------------------------
INSERT INTO public.events (titre, slug, image_url, image_alt, category_id, description, date_debut, heure_debut, date_fin, heure_fin, pays, ville, lieu, organisateur, organisateur_description, lien_inscription, site_web, mots_cles, type_evenement, statut, mise_en_avant, demo, published_at) VALUES
('Forum Afrique Diaspora Business','forum-afrique-diaspora-business','https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=70','Salle de conférence remplie lors d''un forum économique',(SELECT id FROM public.categories WHERE slug='business'),'Deux journées de rencontres entre investisseurs de la diaspora et porteurs de projets du continent : panels, ateliers sectoriels et rendez-vous B2B.','2026-09-25','09:00','2026-09-26','18:00','France','Paris','Maison de la Mutualité','Association Adna','Réseau panafricain dédié à la mise en relation des diasporas économiques.','https://example.org/inscription','https://example.org',ARRAY['business','diaspora','investissement'],'Forum','publie',true,true,now()),
('Festival Ngoma – Musiques d''Afrique centrale','festival-ngoma','https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=70','Foule levant les bras lors d''un concert en plein air',(SELECT id FROM public.categories WHERE slug='festival'),'Trois soirées de concerts réunissant les nouvelles voix de la rumba, de l''afrobeat et du bikutsi sur la scène du Boulevard du 20 Mai.','2026-09-20','18:30','2026-09-22','23:30','Cameroun','Yaoundé','Boulevard du 20 Mai','HEMLÉ Mag','Magazine dédié à l''Afrique, ses diasporas et ses nations.','https://example.org/billets',NULL,ARRAY['musique','festival','rumba'],'Festival','publie',true,true,now()),
('Salon de la Mode Africaine Contemporaine','salon-mode-africaine-contemporaine','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70','Défilé de mode avec créations colorées',(SELECT id FROM public.categories WHERE slug='mode'),'Créateurs du continent et de la diaspora présentent leurs collections, avec défilés, showroom et table ronde sur la production textile locale.','2026-10-10','11:00','2026-10-12','20:00','Côte d''Ivoire','Abidjan','Sofitel Abidjan Hôtel Ivoire','Collectif Wax & Co','Collectif de créateurs ouest-africains.',NULL,'https://example.org',ARRAY['mode','création','textile'],'Salon','publie',true,true,now()),
('Bootcamp Entrepreneuriat Tech Dakar','bootcamp-entrepreneuriat-tech-dakar','https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=70','Équipe travaillant autour d''une table lors d''un atelier',(SELECT id FROM public.categories WHERE slug='entrepreneuriat'),'Une semaine intensive pour structurer son projet : product-market fit, financement, juridique et pitch devant un jury d''investisseurs.','2026-10-05','08:30','2026-10-09','17:00','Sénégal','Dakar','Innovation Hub Almadies','Dakar Startup House','Incubateur sénégalais accompagnant les jeunes pousses numériques.','https://example.org/candidature',NULL,ARRAY['startup','tech','formation'],'Bootcamp','publie',false,true,now()),
('Conférence Santé & Excellence Africaine','conference-sante-excellence-africaine','https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=70','Intervenant s''adressant à un auditoire lors d''une conférence',(SELECT id FROM public.categories WHERE slug='conference'),'Praticiens africains et de la diaspora échangent sur la coopération hospitalière, la formation médicale et le retour d''expertise vers le continent.','2026-11-14','09:30',NULL,'17:30','Belgique','Bruxelles','Bozar','Réseau Santé Diaspora','Réseau de professionnels de santé de la diaspora africaine.','https://example.org/inscription',NULL,ARRAY['santé','conférence','diaspora'],'Conférence','publie',false,true,now()),
('Nuit des Littératures Afro-Québécoises','nuit-litteratures-afro-quebecoises','https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=70','Livres ouverts sur une table lors d''une soirée littéraire',(SELECT id FROM public.categories WHERE slug='culture'),'Lectures, slam et rencontres avec des autrices et auteurs afro-descendants du Québec, suivies d''une séance de dédicaces.','2026-09-19','19:00',NULL,'23:00','Canada','Montréal','Maison de la culture Notre-Dame-de-Grâce','Collectif Plume Noire','Collectif littéraire montréalais.',NULL,'https://example.org',ARRAY['littérature','culture','québec'],'Soirée','publie',false,true,now()),
('Grand Tournoi Communautaire de Lagos','grand-tournoi-communautaire-lagos','https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=70','Joueurs de football sur un terrain au coucher du soleil',(SELECT id FROM public.categories WHERE slug='sport'),'Tournoi inter-quartiers réunissant seize équipes amateurs, avec animations, stands associatifs et concert de clôture.','2026-09-26','08:00','2026-09-27','20:00','Nigéria','Lagos','Teslim Balogun Stadium','Lagos Youth Network','Association de jeunesse basée à Lagos.',NULL,NULL,ARRAY['sport','communauté','jeunesse'],'Tournoi','publie',false,true,now()),
('Exposition « Mémoires Traversées »','exposition-memoires-traversees','https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1600&q=70','Visiteurs observant des œuvres dans une galerie d''art',(SELECT id FROM public.categories WHERE slug='art'),'Une quinzaine d''artistes plasticiens interrogent les récits de migration entre l''Afrique et l''Europe à travers photographie, textile et installation.','2026-10-02','10:00','2026-11-30','19:00','France','Marseille','Friche la Belle de Mai','Galerie Sankofa','Galerie indépendante dédiée aux artistes afro-contemporains.',NULL,'https://example.org',ARRAY['art','exposition','migration'],'Exposition','publie',false,true,now()),
('Assises des Institutions Panafricaines','assises-institutions-panafricaines','https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1600&q=70','Grande salle institutionnelle avec pupitres',(SELECT id FROM public.categories WHERE slug='institution'),'Rencontre annuelle des institutions publiques et organisations régionales autour de la mobilité, de la jeunesse et de l''intégration continentale.','2026-12-03','09:00','2026-12-04','17:00','Éthiopie','Addis-Abeba','Centre de conférences des Nations Unies','Commission Jeunesse UA','Organe consultatif dédié aux politiques de jeunesse.',NULL,NULL,ARRAY['institution','politique','jeunesse'],'Assises','publie',false,true,now()),
('Atelier Cuisine & Récits d''Alchimie','atelier-cuisine-recits-alchimie','https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=70','Plats africains préparés lors d''un atelier culinaire',(SELECT id FROM public.categories WHERE slug='formation'),'Atelier culinaire et narratif autour des mets d''Afrique centrale, animé par une cheffe de la diaspora, suivi d''un dîner partagé.','2026-09-20','15:00',NULL,'21:00','Belgique','Liège','La Cité Miroir','Nathalie Ngoum','Cheffe et autrice, l''alchimie des mets et des mots.','https://example.org/reservation',NULL,ARRAY['cuisine','atelier','diaspora'],'Atelier','publie',false,true,now()),
('Rencontres du Tourisme Congolais','rencontres-tourisme-congolais','https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1600&q=70','Paysage naturel avec fleuve et végétation luxuriante',(SELECT id FROM public.categories WHERE slug='communaute'),'Professionnels du tourisme, guides et acteurs culturels présentent les nouvelles destinations du bassin du Congo.','2026-11-21','10:00','2026-11-22','18:00','République du Congo','Brazzaville','Palais des Congrès','Christian Mpea','Promoteur du nouveau visage du tourisme congolais.',NULL,'https://example.org',ARRAY['tourisme','communauté','congo'],'Rencontres','publie',false,true,now()),
('Journée Portes Ouvertes des Associations','journee-portes-ouvertes-associations','https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=70','Groupe de bénévoles réunis autour de stands associatifs',(SELECT id FROM public.categories WHERE slug='association'),'Une cinquantaine d''associations afro-descendantes présentent leurs actions solidaires, culturelles et éducatives.','2026-10-18','11:00',NULL,'19:00','France','Lyon','Halle Girard','Fédération Diaspora Solidaire','Fédération d''associations de la diaspora africaine en France.',NULL,NULL,ARRAY['association','solidarité'],'Portes ouvertes','publie',false,true,now());