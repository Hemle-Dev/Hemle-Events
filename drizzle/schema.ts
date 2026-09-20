/**
 * Le schéma canonique est volontairement écrit en SQL dans `drizzle/migrations` :
 * il contient des politiques RLS, fonctions, triggers et objets Supabase Storage
 * qui ne peuvent pas être décrits fidèlement par le DSL Drizzle.
 *
 * Ce fichier existe uniquement pour satisfaire la configuration de drizzle-kit.
 * Utiliser `npm run db:migrate`, et non `drizzle-kit push`.
 */
export {};
