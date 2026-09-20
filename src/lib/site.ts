/**
 * Configuration HEMLÉ Events.
 * Les liens publics (formulaire, réseaux sociaux, site, email) proviennent de
 * variables d'environnement VITE_HEMLE_* et peuvent être changés sans toucher au code.
 */
const env = import.meta.env as Record<string, string | undefined>;

export const GOOGLE_FORM_URL =
  env["VITE_HEMLE_GOOGLE_FORM_URL"] ?? "https://forms.gle/tJkx3y8vsEstCKdTA";
export const WHATSAPP_URL =
  env["VITE_HEMLE_WHATSAPP_URL"] ??
  "https://whatsapp.com/channel/0029VamtqHj2UPB907djSx3S";

export const SITE = {
  name: "HEMLÉ Events",
  tagline: "Découvrez les événements qui font vibrer l'Afrique et sa diaspora.",
  email: env["VITE_HEMLE_EMAIL"] ?? "hemlemag@gmail.com",
  magazine: env["VITE_HEMLE_MAGAZINE_URL"] ?? "https://hemlemagazine.com/",
  facebook:
    env["VITE_HEMLE_FACEBOOK_URL"] ??
    "https://web.facebook.com/people/HEMLE-MAG/61593611603540/",
  instagram: env["VITE_HEMLE_INSTAGRAM_URL"] ?? "https://www.instagram.com/hemlemag2026/",
  linkedin: env["VITE_HEMLE_LINKEDIN_URL"] ?? "https://www.linkedin.com/in/hemle-mag",
  whatsapp: WHATSAPP_URL,
} as const;

export const NAV_LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/evenements", label: "Événements" },
  { to: "/categories", label: "Catégories" },
  { to: "/a-propos", label: "À propos" },
] as const;
