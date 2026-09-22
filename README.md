# HEMLÉ Events

Agenda des événements d’Afrique et de ses diasporas : React, TanStack Start, Tailwind CSS et Supabase.

Le site ne dépend plus du runtime ni de l’hébergement d’images Lovable. **Supabase reste nécessaire** pour la base de données, les comptes et les images téléversées. Le Compose fourni démarre uniquement le site : il n’installe pas Supabase, n’applique pas les migrations et ne configure ni domaine ni HTTPS.

## Sommaire

- [Ordre de mise en service](#ordre-de-mise-en-service)
- [Installation](#installation)
- [Configuration](#configuration)
- [Migrations](#migrations)
- [Comptes et administrateur](#comptes-et-administrateur)
- [Nettoyage des données factices](#nettoyage-des-données-factices)
- [Exécution locale et tests](#exécution-locale-et-tests)
- [Construction et déploiement Docker](#construction-et-déploiement-docker)
- [Domaine, HTTPS et SEO](#domaine-https-et-seo)
- [Maintenance et sauvegardes](#maintenance-et-sauvegardes)
- [Dépannage](#dépannage)
- [Checklist de publication](#checklist-de-publication)

## Ordre de mise en service

1. Disposer d’un projet Supabase sous votre contrôle et sauvegarder toute base existante.
2. Installer les dépendances et remplir `.env`.
3. Appliquer les migrations selon votre situation : **base neuve ou base historique**, pas les deux procédures.
4. Convertir les anciens comptes si nécessaire, puis créer l’administrateur.
5. Vérifier les accès et nettoyer les événements factices après sauvegarde.
6. Configurer le domaine et les liens publics avant de construire l’image Docker.
7. Démarrer le conteneur, configurer HTTPS et tester le site avant ouverture publique.

Construire l’image n’effectue pas les étapes 3 à 5. Le bootstrap administrateur peut s’exécuter au démarrage Docker, mais uniquement si la base est déjà migrée et les variables correspondantes renseignées.

## Installation

### Prérequis

- Node.js 22 LTS, version **22.12 minimum**, avec npm 10 pour les commandes locales.
- Docker Engine et Docker Compose v2 pour construire et exécuter le conteneur.
- Un projet Supabase accessible depuis la machine de migration, le serveur et les navigateurs.
- Les accès PostgreSQL privilégiés et la clé serveur du projet Supabase.

Les commandes ci-dessous s’exécutent à la racine du dépôt dans un terminal Linux/macOS. Node sur l’hôte n’est pas nécessaire pour construire l’image seule ; il est nécessaire pour la procédure de migration locale documentée ici.

```bash
node --version
npm --version
docker compose version

# Ne pas écraser un .env existant.
cp -n .env.example .env
chmod 600 .env
npm ci
```

Modifier `.env` dans votre éditeur. Remplacer les valeurs `replace_me`, `your-project` et les liens `example.com` de l’exemple.

Utiliser le `package-lock.json` versionné. La configuration actuelle utilise Vite 7.3.1 et Tailwind 4.1.18. **Ne pas utiliser `--force` ou `--legacy-peer-deps`, ni supprimer le verrou pour contourner un conflit.** L’override `js-yaml` fige une version disponible dans le registre utilisé lors de la préparation du projet.

## Configuration

### Variables d’environnement

| Variable                         | Utilisation                                    | Valeur attendue                                                                       |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`              | Navigateur, injectée au build                  | URL du projet Supabase                                                                |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Navigateur, injectée au build                  | Clé publique/publishable du même projet                                               |
| `VITE_SITE_URL`                  | Canoniques, partage, sitemap                   | `http://localhost:3000` en local ; domaine HTTPS définitif en production, sans chemin |
| `SUPABASE_URL`                   | Serveur et scripts                             | Même projet que `VITE_SUPABASE_URL`                                                   |
| `SUPABASE_PUBLISHABLE_KEY`       | Authentification côté serveur                  | Même clé publique que celle du navigateur                                             |
| `SUPABASE_SERVICE_ROLE_KEY`      | Gestion privilégiée des comptes et nettoyage   | Clé secrète serveur, jamais une clé publique                                          |
| `DATABASE_URL`                   | Migrations depuis l’hôte                       | Chaîne de connexion PostgreSQL du projet                                              |
| `BOOTSTRAP_ADMIN_ID`             | Création/récupération de l’administrateur      | Identifiant choisi, par exemple `administrateur`                                      |
| `BOOTSTRAP_ADMIN_PASSWORD`       | Mot de passe initial ou remplacement explicite | Secret aléatoire d’au moins 12 caractères ; vide après activation                     |
| `BOOTSTRAP_ADMIN_FORCE_PASSWORD` | Remplacement du mot de passe existant          | `false` normalement ; `true` uniquement pendant une récupération volontaire           |
| `PORT`                           | Port hôte publié par Compose                   | Facultatif, `3000` par défaut ; port interne toujours `3000`                          |

`DATABASE_URL` utilise le mot de passe **PostgreSQL**, pas une clé API. Récupérer la chaîne depuis les paramètres de connexion du projet ; encoder les caractères spéciaux du mot de passe dans l’URL et conserver les paramètres TLS recommandés. Privilégier une connexion directe ou un pooler en mode session pour les migrations. Voir la [documentation des connexions Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

Le nom `SUPABASE_SERVICE_ROLE_KEY` est celui attendu par le code : y placer la clé secrète serveur adaptée au projet, ou sa clé historique `service_role`. Les clés publiques et secrètes ont des responsabilités différentes : voir les [clés API Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

**Ne jamais préfixer une clé secrète par `VITE_`, la commiter ou la publier dans des logs/captures.** `.env` est ignoré par Git et exclu du contexte Docker. Éviter de partager la sortie complète de `docker compose config`, qui peut contenir les secrets résolus.

### Coordonnées et liens publics

Renseigner avant compilation :

- `VITE_HEMLE_GOOGLE_FORM_URL` : formulaire de proposition d’événement.
- `VITE_HEMLE_WHATSAPP_URL` : canal WhatsApp.
- `VITE_HEMLE_EMAIL` : contact public, sans rapport avec les identifiants de connexion.
- `VITE_HEMLE_MAGAZINE_URL` : site du magazine.
- `VITE_HEMLE_FACEBOOK_URL`, `VITE_HEMLE_INSTAGRAM_URL`, `VITE_HEMLE_LINKEDIN_URL` : réseaux sociaux.

Une valeur vide utilise les liens de repli de `src/lib/site.ts` ; elle ne masque pas automatiquement le lien. Vérifier toutes les destinations.

### Quand reconstruire ?

- Variable `VITE_*` modifiée : **reconstruire l’image**, puis recréer le conteneur.
- Secret serveur modifié : recréer le conteneur avec le nouvel environnement ; aucun rebuild nécessaire.
- `.env` modifié en développement : redémarrer le serveur.

Un simple `docker compose restart` ne met pas à jour l’environnement d’un conteneur existant.

### Réglages Supabase

Le projet doit fournir Database, Auth et Storage. Les migrations ne suffisent pas sur un PostgreSQL nu : elles utilisent notamment `auth.users`, `auth.uid()`, les tables Storage et les rôles Supabase.

Avant ouverture :

1. Désactiver les inscriptions publiques, les connexions anonymes et les fournisseurs externes non utilisés dans Auth. Les comptes sont créés par le serveur à la demande de l’administrateur.
2. Conserver le fournisseur email/mot de passe nécessaire à l’authentification interne. Aucune adresse personnelle n’est demandée aux membres.
3. Vérifier l’accès au schéma `public` via la Data API avec les droits et politiques prévus. Ne pas désactiver RLS pour résoudre une erreur d’accès.
4. Après migration, vérifier le bucket `event-images` : public, limite de 8 Mio, formats JPEG/PNG/WebP/AVIF. Ne pas y stocker de documents confidentiels.

## Migrations

### Précautions communes

Sauvegarder la base et vérifier sa restauration avant toute migration sur des données utiles. Vérifier que `DATABASE_URL` et les clés API ciblent le même projet. Suspendre les écritures éditoriales pendant une migration historique et tester d’abord sur une copie si possible.

Les SQL de référence sont dans `drizzle/migrations/`. Le nom du dossier est historique : `npm run db:migrate` utilise `scripts/migrate-database.mjs` et le pilote `postgres`, pas Drizzle Kit ni `supabase db push`.

| Migration                             | Effet principal                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `0000_create_hemle_events_schema.sql` | Tables, rôles, politiques initiales, catégories et événements de démonstration      |
| `0001_add_date_fin_effective.sql`     | Date de fin effective utilisée pour les filtres                                     |
| `0002_secure_identifier_accounts.sql` | Identifiants normalisés et uniques, droits des comptes actifs, contraintes de dates |
| `0003_event_image_storage.sql`        | Bucket d’images et droits Storage                                                   |

### Cas A — Nouveau projet Supabase sans tables applicatives

Après installation des dépendances et configuration de `DATABASE_URL` :

```bash
npm run db:migrate
```

La commande charge `.env`, applique les migrations en transaction et enregistre leurs empreintes dans `drizzle.__drizzle_migrations`. Un verrou évite deux migrations simultanées. Une nouvelle exécution saute les migrations enregistrées ; une empreinte modifiée provoque une erreur. Ne jamais modifier une migration déjà appliquée pour la rejouer.

La migration initiale insère des démonstrations : **une base neuve n’est pas encore une base publique nettoyée**.

### Cas B — Base déjà suivie par le journal de ce projet

Si les migrations précédentes figurent dans `drizzle.__drizzle_migrations` et correspondent aux fichiers du dépôt, utiliser également `npm run db:migrate`. Seules les migrations suivantes sont appliquées. Le journal Supabase CLI et le journal de ce script ne sont pas interchangeables.

### Cas C — Base historique Lovable sans journal applicatif

La commande refuse volontairement de rejouer l’initialisation si `public.events` existe sans journal. **Ne pas supprimer les tables ni créer un journal approximatif pour contourner ce contrôle.**

Dans l’éditeur SQL Supabase, commencer par cet inventaire en lecture seule :

```sql
SELECT to_regclass('public.events') AS events,
       to_regclass('public.profiles') AS profiles,
       to_regclass('drizzle.__drizzle_migrations') AS migration_journal;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events'
  AND column_name = 'date_fin_effective';

SELECT conname FROM pg_constraint
WHERE conrelid = to_regclass('public.profiles')
  AND conname = 'profiles_identifiant_format_check';

SELECT id FROM storage.buckets WHERE id = 'event-images';
```

Ces indices ne remplacent pas une comparaison du schéma et des politiques avec les SQL, notamment après une exécution partielle.

Si `0000` et `0001` sont déjà intégralement présents et `0002`/`0003` absents :

1. Exécuter le contenu de `0002_secure_identifier_accounts.sql` dans une transaction (`BEGIN;` avant, `COMMIT;` après).
2. Après succès, faire de même avec `0003_event_image_storage.sql`.
3. Vérifier les contraintes, les politiques et le bucket avant de convertir les comptes.

Ne pas rejouer `0000` ou `0001` dans ce cas. Si `0001` manque réellement, l’appliquer avant `0002`, après vérification. Ne pas relancer aveuglément `0002` ou `0003` : leurs créations de contraintes/politiques ne sont pas toutes idempotentes.

`0002` peut renommer les identifiants invalides ou dupliqués : conserver leur correspondance pour informer les membres. Les événements programmés sans date de publication sont remis en brouillon. Des dates de fin antérieures au début peuvent faire échouer la nouvelle contrainte : corriger les données concernées plutôt que supprimer la contrainte.

La procédure manuelle ne renseigne pas le journal du script. Conserver une trace des SQL appliqués et gérer explicitement les futures migrations tant qu’une reprise contrôlée du journal n’a pas été réalisée.

**Lancer les migrations depuis le dépôt sur l’hôte, pas dans l’image finale actuelle** : elle n’embarque ni les SQL ni le pilote PostgreSQL de développement. `docker compose up` n’exécute aucune migration.

## Comptes et administrateur

### Conversion d’anciens comptes

Après `0002`, si des membres utilisaient auparavant une adresse email :

```bash
npm run migrate:accounts
```

Cette commande modifie réellement les comptes, sans simulation : elle remplace l’email Auth par `identifiant@accounts.hemle.invalid` et vide l’email du profil. Elle conserve les mots de passe, UUID et rôles. Sauvegarder les correspondances avant conversion et tester une reconnexion après l’opération.

Le script lit les profils en une seule requête, sans pagination : pour une équipe dépassant la limite de réponse configurée dans Supabase, adapter le script avant utilisation et vérifier tous les comptes.

### Créer le premier administrateur

Dans `.env`, définir `BOOTSTRAP_ADMIN_ID` et un `BOOTSTRAP_ADMIN_PASSWORD` unique d’au moins 12 caractères ; laisser `BOOTSTRAP_ADMIN_FORCE_PASSWORD=false`.

L’identifiant est normalisé en minuscules, avec lettres non accentuées, chiffres, points, tirets et underscores ; utiliser de 3 à 48 caractères. Ne pas saisir un mot de passe réel dans une commande conservée dans l’historique du terminal.

```bash
npm run bootstrap:admin
```

Le script crée le compte s’il n’existe pas. Sinon, il conserve son mot de passe sauf remplacement explicitement demandé. **Il réactive le compte ciblé et lui attribue le rôle administrateur** : vérifier l’identifiant avant exécution.

Ouvrir `/auth`, se connecter avec cet identifiant et son mot de passe, puis utiliser `/admin/equipe` pour créer les autres comptes, gérer leurs rôles/activations et remplacer leurs mots de passe.

L’interface n’utilise aucune adresse email personnelle. Supabase Auth utilise néanmoins une adresse technique non distribuable en interne. La modification du mot de passe des **autres** comptes est réservée aux administrateurs ; l’API native Supabase conserve la possibilité pour un utilisateur authentifié de modifier son propre mot de passe.

### Bootstrap Docker et récupération

Au démarrage Docker, le bootstrap s’exécute seulement si **les deux** variables `BOOTSTRAP_ADMIN_ID` et `BOOTSTRAP_ADMIN_PASSWORD` sont non vides. Un échec du bootstrap bloque le lancement du site : vérifier les migrations et la clé serveur dans les logs.

Après connexion réussie, vider `BOOTSTRAP_ADMIN_PASSWORD` dans `.env`, remettre `BOOTSTRAP_ADMIN_FORCE_PASSWORD=false`, puis recréer le service :

```bash
docker compose up -d --force-recreate web
```

Pour récupérer un administrateur, définir temporairement un nouveau mot de passe et `BOOTSTRAP_ADMIN_FORCE_PASSWORD=true`, exécuter `npm run bootstrap:admin` depuis l’hôte, puis remettre les valeurs de sécurité. Aucun mot de passe administrateur par défaut n’est fourni.

## Affiches et enregistrement des événements

La fiche publique conserve son bandeau avec le titre superposé. Un clic sur l’image ou sur **Voir l’affiche** ouvre une vue plein écran avec zoom. À la souris, maintenir le bouton et tirer directement l’affiche vers le bas agrandit le bandeau ; tirer vers le haut le réduit. Les flèches haut/bas fonctionnent lorsque l’image a le focus. Sur écran tactile, le défilement naturel est conservé et un appui ouvre l’affiche. Échap ou la croix ferment la vue agrandie.

Le bouton de copie affiche une coche et **Lien copié !** après réussite. En cas de refus du navigateur, il signale l’échec sans afficher de fausse confirmation.

Dans l’administration :

- Le fichier choisi reste un aperçu local jusqu’au clic sur **Enregistrer**. Annuler ou choisir une autre image ne crée pas de fichier dans Storage.
- L’enregistrement utilise les droits du compte connecté ; après réussite, la page revient à `/admin/evenements`, pour une création comme pour une modification.
- La nouvelle image reçoit une URL distincte pour éviter le cache de l’ancienne. L’ancienne image du bucket `event-images` est supprimée via l’API Storage **après** l’enregistrement, seulement si aucun événement ne la référence encore. Les images externes sont conservées.
- Un échec d’enregistrement conserve l’ancienne image ; le nouveau fichier est nettoyé s’il n’a pas été référencé. Un échec de nettoyage est signalé explicitement. Aucune purge rétroactive des anciens fichiers orphelins n’est effectuée.
- La suppression est définitive sans sauvegarde Storage. Le contrôle des références et la suppression nécessitent `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement. Les migrations existantes suffisent ; aucune nouvelle migration n’est nécessaire pour cette fonctionnalité.

Tests locaux sans modification des données réelles : `npm test` couvre le cycle de remplacement et les appels Supabase simulés. Pour les interactions visuelles, avec Google Chrome installé :

```bash
# Terminal 1 : serveur de composants isolé, sans connexion à Supabase.
npm run dev -- --config tests/browser/vite.config.ts

# Terminal 2 : clic, glissement, zoom, fermeture et retour de copie.
node scripts/test-poster-browser.mjs
```

Le test vérifie les formats mobile, bureau et paysage, utilise un presse-papiers simulé et indique le dossier temporaire des captures. La recette finale d’enregistrement sur votre instance Supabase reste nécessaire.

## Nettoyage des données factices

Sauvegarder avant suppression. Le nettoyage cible **uniquement les événements marqués `demo = true`** et conserve les catégories, les comptes et les autres événements.

```bash
# Simulation : nombre d’événements concernés, sans suppression.
npm run cleanup:demo

# Seulement après vérification et sauvegarde :
CONFIRM_CLEANUP=DELETE_DEMO_DATA npm run cleanup:demo -- --apply
```

L’opération est irréversible sans sauvegarde. Elle ne supprime pas les objets Storage, les comptes de test, les liens fictifs des autres événements ou les valeurs d’exemple de `.env` : les vérifier séparément. Vérifier aussi qu’aucun événement réel n’est encore marqué `demo`.

Si le conteneur est déjà démarré :

```bash
docker compose exec web node scripts/cleanup-demo-data.mjs
docker compose exec -e CONFIRM_CLEANUP=DELETE_DEMO_DATA web node scripts/cleanup-demo-data.mjs --apply
```

Aucun nettoyage n’est déclenché automatiquement par le build ou par le démarrage Docker.

## Exécution locale et tests

### Développement

```bash
# Charge également les variables serveur dans le processus Node.
node --env-file=.env --run dev
```

Vite utilise le port `3000` par défaut et peut en choisir un autre si nécessaire : lire l’URL affichée dans le terminal. La configuration écoute sur toutes les interfaces ; utiliser un réseau de confiance en développement.

En développement, TanStack Start/Vite sert directement les pages et fichiers ; le plugin Nitro est activé uniquement pour le build de production. Le proxy de développement Nitro de la version installée provoquait des flux d’images corrompus après 64 Kio et des redirections erronées des modules de routes dynamiques, bloquant le chargement de `/auth`.

Après une modification de `vite.config.ts`, redémarrer le serveur puis recharger le navigateur sans cache. Pour contrôler le transfert du logo, les modules dynamiques et le formulaire de connexion sans utiliser de compte :

```bash
DEV_BASE_URL=http://localhost:3000 node scripts/check-dev-server.mjs
```

Remplacer l’adresse par celle utilisée dans le navigateur pour vérifier également l’accès réseau. Ce test cible le serveur de développement, pas le serveur compilé.

### Contrôles

```bash
npm run typecheck
npm run lint
npm test
npm run build

# Ou les quatre contrôles en une commande :
npm run check
```

### Serveur compilé, hors Docker

```bash
npm run build
node --env-file=.env --run start
```

`npm start` seul ne charge pas `.env` : l’environnement doit alors déjà être injecté par l’hébergeur. Le serveur compilé est `.output/server/index.mjs`.

Dans un second terminal :

```bash
SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
```

Ce test vérifie les réponses publiques, canoniques, langue, favicon, directives d’indexation, sitemap et une 404. Il nécessite une connexion Supabase fonctionnelle ; il ne teste pas la création de comptes ni le téléversement d’images.

`tests/database.sql` teste les migrations et droits sur des schémas Auth/Storage simulés. À exécuter avec `psql -f tests/database.sql` **uniquement sur un PostgreSQL vide et jetable**, jamais sur le projet réel. Ces tests ne remplacent pas une recette Auth/Storage de bout en bout.

## Construction et déploiement Docker

### Construire l’image soi-même

Après avoir rempli `.env`, en particulier les valeurs publiques `VITE_*` :

```bash
# Vérification sans afficher les secrets résolus.
docker compose config --quiet

# Construction uniquement : ne démarre pas le site.
docker compose build web
docker compose images
```

Le Dockerfile utilise Node 22 Alpine, `npm ci`, une compilation multi-étapes et un utilisateur non privilégié à l’exécution. Ne pas ajouter les secrets serveur comme arguments de build.

Le verrou inclut les variantes natives de Lightning CSS et esbuild, notamment Linux musl pour Alpine. `npm test` contrôle leur présence et leur version. Conserver et versionner `package.json` **et** `package-lock.json` ensemble ; ne pas remplacer `npm ci` dans le Dockerfile par une installation forcée.

Si Docker signale `EUSAGE` / `Missing: ... from lock file`, utiliser le verrou corrigé puis relancer `docker compose build web`. Pour une future réparation du verrou, travailler dans un dossier temporaire sans `node_modules`, avec la version de npm indiquée dans le journal Docker (10.9.8 lors du diagnostic) :

```bash
lock_check_dir=$(mktemp -d)
cp package.json package-lock.json "$lock_check_dir/"
npm exec --yes --package=npm@10.9.8 -- npm install --prefix "$lock_check_dir" --package-lock-only --ignore-scripts --no-audit --no-fund
npm exec --yes --package=npm@10.9.8 -- npm ci --prefix "$lock_check_dir" --no-audit --no-fund
# Seulement après réussite : examiner le diff avant de conserver le verrou.
diff -u package-lock.json "$lock_check_dir/package-lock.json"
```

La commande `diff` renvoie normalement le code 1 lorsqu’il y a des différences. Cette procédure ne modifie ni les dépendances installées du projet ni ses données et ne construit aucune image.

### Démarrer et contrôler

Une fois les migrations appliquées et le bootstrap configuré ou déjà exécuté :

```bash
docker compose up -d web
docker compose ps
docker compose logs --tail=100 web
docker compose logs -f web
```

`Ctrl+C` quitte le suivi des logs sans arrêter le service. Le site est accessible sur `http://localhost:3000`, ou le port hôte choisi avec `PORT`.

Le healthcheck interroge `/` : comme l’accueil lit Supabase, le conteneur peut démarrer mais rester `unhealthy` si Supabase est inaccessible. La politique `unless-stopped` concerne les processus arrêtés ; un état `unhealthy` ne garantit pas à lui seul un redémarrage automatique.

Vérifier le parcours public, `/auth`, les accès selon les rôles, la création d’un événement et le téléversement d’une image. Un build réussi ne valide pas ces parcours.

### Changement de configuration ou mise à jour

```bash
# Code ou variables VITE_* modifiés :
docker compose build web
docker compose up -d --force-recreate web

# Seulement les variables serveur modifiées :
docker compose up -d --force-recreate web
```

Compose lit `.env` pour substituer les valeurs explicitement référencées dans `docker-compose.yml`. `DATABASE_URL` et les variables non déclarées ne sont pas automatiquement transmis au service.

### Arrêter

```bash
docker compose stop web
# Ou supprimer les conteneurs/réseaux du projet :
docker compose down
```

La base et les images téléversées restent dans Supabase : ces commandes ne les suppriment pas. Aucun volume applicatif local de données n’est défini dans le Compose actuel.

## Domaine, HTTPS et SEO

1. Configurer le DNS du domaine pour atteindre votre serveur.
2. Placer un reverse proxy avec certificat TLS devant le service et transmettre les informations d’hôte/protocole d’origine. Ne pas exposer le serveur de développement.
3. Si le proxy tourne sur le même hôte, restreindre si nécessaire le port publié dans Compose à `127.0.0.1:${PORT:-3000}:3000` et adapter le pare-feu. Le fichier fourni publie par défaut sur toutes les interfaces.
4. Définir `VITE_SITE_URL=https://events.votre-domaine.tld`, puis reconstruire et recréer le conteneur.
5. Vérifier que canoniques, partage et sitemap ne contiennent plus `localhost` ni l’ancien domaine Lovable.

Le code fournit du rendu serveur, des titres/descriptions, des canoniques, Open Graph, des données structurées `Event`, `/robots.txt` et un `/sitemap.xml` dynamique. Le sitemap exclut les démonstrations et événements non publiés ; administration et connexion sont marquées `noindex`. Ces directives SEO ne remplacent pas l’authentification.

Vérifier `/robots.txt` et `/sitemap.xml` sur le domaine HTTPS, puis soumettre le sitemap dans Google Search Console et Bing Webmaster Tools. Contrôler les titres, descriptions, dates, lieux, images et coordonnées réels. Ni l’indexation effective ni le classement ne sont garantis par le code.

## Maintenance et sauvegardes

- Sauvegarder PostgreSQL **et les objets Storage** : une sauvegarde SQL ne contient pas à elle seule les fichiers images.
- Conserver les secrets séparément du dépôt et des images distribuées.
- Tester les mises à jour en recette ; appliquer les migrations nécessaires avant d’ouvrir les nouvelles fonctionnalités.
- Conserver une image précédente identifiée par un tag ou digest pour un éventuel retour arrière.
- Redéployer une ancienne image n’annule pas les migrations : vérifier la compatibilité du schéma et prévoir une restauration contrôlée si nécessaire. Aucun rollback SQL automatique n’est fourni.
- Surveiller les logs et renouveler immédiatement toute clé serveur exposée.

## Dépannage

| Symptôme                                    | Vérification/action                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ERESOLVE` Vite/Tailwind ou `ETARGET` OXC   | Utiliser les manifestes et le verrou actuels, puis `npm ci`. Ne pas réintroduire Vite 8 ni contourner avec `--legacy-peer-deps`. |
| Timeout npm                                 | Vérifier DNS, proxy et registre ; relancer `npm ci` quand le réseau fonctionne.                                                  |
| Variables serveur absentes en local         | Utiliser `node --env-file=.env --run dev` ou `node --env-file=.env --run start`.                                                 |
| Clé serveur absente dans Compose            | Renseigner `SUPABASE_SERVICE_ROLE_KEY`, puis recréer le service.                                                                 |
| « Base historique sans journal »            | Suivre le cas C ; ne pas effacer les tables.                                                                                     |
| Contrainte/politique déjà existante         | Examiner les migrations appliquées ; ne pas rejouer les SQL à l’aveugle.                                                         |
| Empreinte de migration modifiée             | Retrouver le fichier correspondant au journal et préparer une nouvelle migration ; ne pas falsifier l’empreinte.                 |
| Ancien membre incapable de se connecter     | Vérifier conversion, nouvel identifiant, rôle et `profiles.actif`.                                                               |
| Docker redémarre en boucle                  | Lire les logs : le bootstrap échoue si la clé est invalide ou la base non migrée.                                                |
| HTTP 500, `ECONNRESET`, `fetch failed`      | Vérifier disponibilité du projet Supabase, URL, clés et connectivité sortante.                                                   |
| Échec de téléversement                      | Vérifier migration Storage, rôle actif, format et limite de 8 Mio.                                                               |
| Ancien domaine après modification de `.env` | Reconstruire l’image : les variables `VITE_*` sont intégrées au bundle.                                                          |
| Service `unhealthy`                         | Examiner les logs et la réponse de `/`, notamment l’accès Supabase.                                                              |
| Port `3000` occupé                          | Définir un autre `PORT` pour Compose, puis recréer le service.                                                                   |

## Checklist de publication

- [ ] Supabase et hébergement sous votre contrôle ; sauvegardes vérifiées.
- [ ] Secrets hors Git et bundle navigateur ; valeurs d’exemple remplacées.
- [ ] Inscriptions publiques et fournisseurs non utilisés désactivés.
- [ ] Migrations appropriées appliquées ; droits RLS/Storage vérifiés.
- [ ] Anciens comptes convertis si nécessaire ; administrateur créé et testé.
- [ ] Mot de passe de bootstrap retiré après activation.
- [ ] Démonstrations nettoyées après sauvegarde ; liens et comptes de test revus.
- [ ] `npm run check` réussi et image Docker construite sur votre machine.
- [ ] Service sain et parcours public/administrateur testés avec le vrai Supabase.
- [ ] Domaine HTTPS et `VITE_SITE_URL` cohérents ; proxy et pare-feu configurés.
- [ ] Sitemap, robots, métadonnées et 404 vérifiés sur le domaine public.

Lors des vérifications précédentes, TypeScript, lint, tests unitaires et compilation ont réussi, ainsi que les tests SQL sur base isolée. La construction Docker n’a pas été exécutée et la recette HTTP complète a été bloquée par une connexion Supabase interrompue. **Ces validations de déploiement restent à effectuer dans votre environnement.**
