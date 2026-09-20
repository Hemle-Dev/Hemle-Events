# HEMLÉ Events

Agenda éditorial des événements d’Afrique et de ses diasporas. Le projet est autonome : React/TanStack Start, Supabase et Docker, sans runtime ni hébergement d’assets Lovable.

## Fonctionnalités

- site public SSR : accueil, catalogue, filtres, catégories et fiches événement ;
- publication immédiate ou programmée ;
- espace équipe protégé par identifiant et mot de passe ;
- rôles administrateur, éditeur et modérateur ;
- gestion des événements, catégories, comptes, rôles et mots de passe ;
- images dans Supabase Storage ;
- politiques RLS et désactivation immédiate des comptes ;
- scripts idempotents pour créer le premier administrateur et retirer les données de démonstration.

Supabase Auth exige techniquement une adresse email ou un téléphone. L’application génère donc une adresse interne non distribuable de la forme `identifiant@accounts.hemle.invalid`. L’utilisateur ne saisit et ne voit jamais d’adresse email.

## Prérequis

- Node.js 22.12 minimum (22 LTS conseillé) et npm 10 ;
- un projet Supabase ;
- Docker avec Compose pour le déploiement conteneurisé.

## Installation locale

```bash
# Seulement si .env n’existe pas déjà :
cp -n .env.example .env
npm ci
npm run dev
```

Renseigner au minimum dans `.env` :

- `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` pour le navigateur ;
- `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` pour le serveur ;
- `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur ;
- `DATABASE_URL` pour exécuter les migrations.

Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` dans une variable préfixée par `VITE_`.

L’installation utilise Vite 7.3.1 et Tailwind 4.1.18 avec un verrou npm versionné. Ne pas utiliser `--force` ou `--legacy-peer-deps`. L’override `js-yaml` évite une version transitive indisponible dans le registre utilisé pour ce projet. Les migrations SQL utilisent directement le pilote PostgreSQL, sans générateur de schéma.

## Base de données

Les migrations SQL sont dans `drizzle/migrations`. Pour une base neuve :

```bash
npm run db:migrate
```

Dans Supabase Auth, **désactiver les inscriptions publiques** et les fournisseurs externes non utilisés. Seul le serveur doit créer les comptes. Les changements de mots de passe des autres utilisateurs passent par une fonction serveur vérifiant le rôle administrateur ; Supabase Auth conserve toutefois son API native de modification du propre mot de passe pour un utilisateur authentifié.

Pour la base Supabase historique déjà initialisée, ne rejouez pas `0000` et `0001`. Appliquez seulement, dans cet ordre, `0002_secure_identifier_accounts.sql` puis `0003_event_image_storage.sql` avec l’éditeur SQL Supabase ou PostgreSQL. Convertissez ensuite les anciens comptes :

```bash
npm run migrate:accounts
```

## Premier administrateur

Définir un identifiant et un mot de passe aléatoire d’au moins 12 caractères :

```bash
BOOTSTRAP_ADMIN_ID=administrateur \
BOOTSTRAP_ADMIN_PASSWORD='un-secret-long-et-aleatoire' \
npm run bootstrap:admin
```

Le script est idempotent. Il ne remplace pas le mot de passe d’un compte existant, sauf si `BOOTSTRAP_ADMIN_FORCE_PASSWORD=true`. Les administrateurs peuvent ensuite créer les autres comptes et modifier leurs mots de passe depuis `/admin/equipe`.

Préférer définir le mot de passe dans le fichier `.env` local protégé plutôt que dans la ligne de commande, pour éviter son enregistrement dans l’historique du terminal. Aucun mot de passe administrateur prédéfini n’est fourni.

Après le premier démarrage en production, retirer `BOOTSTRAP_ADMIN_PASSWORD` de l’environnement du conteneur.

## Nettoyage avant ouverture publique

Le nettoyage cible uniquement les événements marqués `demo = true` et conserve les catégories.

```bash
# prévisualisation
npm run cleanup:demo

# suppression confirmée
CONFIRM_CLEANUP=DELETE_DEMO_DATA npm run cleanup:demo -- --apply
```

Cette suppression est irréversible. Faire une sauvegarde Supabase avant son exécution sur une base importante.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
npm run build
# ou l’ensemble : npm run check
```

Après démarrage du serveur compilé : `SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs` vérifie les pages publiques, les canoniques, les réponses 404, le sitemap et les directives d’indexation. Ces tests nécessitent une connexion Supabase fonctionnelle.

## Docker

Les variables `VITE_*` sont injectées au build, tandis que les secrets Supabase restent uniquement disponibles à l’exécution.

```bash
cp -n .env.example .env
docker compose build
docker compose up -d
docker compose ps
```

L’application est exposée sur `http://localhost:3000` par défaut. Définir `PORT` pour changer le port hôte.

## Checklist de déploiement public

1. Appliquer les migrations et vérifier les politiques RLS.
2. Créer et tester le compte administrateur.
3. Migrer les éventuels anciens comptes.
4. Sauvegarder puis nettoyer les événements de démonstration.
5. Renseigner `VITE_SITE_URL` avec le domaine public définitif.
6. Remplacer les liens sociaux et le formulaire de proposition.
7. Lancer `npm run check` et `docker compose build`.
8. Retirer le mot de passe de bootstrap de l’environnement.

## Référencement

- Rendu serveur des pages publiques et des résultats du catalogue.
- Titres et descriptions par page, canoniques, Open Graph, langue française et données structurées `Event`.
- `/sitemap.xml` dynamique : pages publiques et événements publiés, hors démonstrations ; `/robots.txt` indique son adresse.
- Administration et connexion exclues de l’indexation (meta et en-tête HTTP).

Avant publication, définir `VITE_SITE_URL=https://votre-domaine`, reconstruire l’image et placer le service derrière un proxy HTTPS. Vérifier les coordonnées, les liens et les contenus, puis soumettre `/sitemap.xml` dans Google Search Console et Bing Webmaster Tools. Le code prépare l’indexation ; ni l’indexation effective ni le classement ne sont garantis.

## Test des droits SQL

`tests/database.sql` initialise des schémas Auth/Storage simulés puis exécute les migrations et teste les accès. À exécuter avec `psql -f tests/database.sql` **uniquement sur une base PostgreSQL vide et jetable** ; jamais sur un projet Supabase existant. Cela ne remplace pas un test de bout en bout avec Supabase Auth et Storage réels.
