import { Link } from "@tanstack/react-router";

import logo from "@/assets/hemle-logo.png.asset.json";
import { SocialLinks } from "@/components/social-links";
import { NAV_LINKS, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="surface-ink mt-24">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div>
          <img src={logo.url} alt="Logo HEMLÉ Mag" className="h-10 w-auto brightness-0 invert" />
          <p className="mt-4 max-w-sm text-sm text-ink-foreground/75">{SITE.tagline}</p>
          <p className="mt-4 text-sm text-ink-foreground/75">
            <a className="underline-offset-4 hover:underline" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          </p>
        </div>

        <nav aria-label="Navigation du pied de page">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-foreground/60">
            Naviguer
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-ink-foreground/80 hover:text-ink-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href="/admin" className="text-ink-foreground/60 hover:text-ink-foreground">
                Espace équipe
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-foreground/60">
            Suivez HEMLÉ
          </h2>
          <SocialLinks className="mt-4" />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HEMLÉ Events — porté par HEMLÉ Magazine.</p>
          <p>Agenda événementiel Afrique &amp; diasporas.</p>
        </div>
      </div>
    </footer>
  );
}
