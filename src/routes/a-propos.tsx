import { createFileRoute } from "@tanstack/react-router";

import { PublicLayout } from "@/components/public-layout";
import { AddEventButton } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE.url}/a-propos` }],
    meta: [
      { title: "À propos de HEMLÉ — HEMLÉ Events" },
      {
        name: "description",
        content:
          "HEMLÉ Events est l'agenda événementiel porté par HEMLÉ Magazine, dédié à l'Afrique, ses diasporas et ses nations.",
      },
      { property: "og:title", content: "À propos de HEMLÉ — HEMLÉ Events" },
      {
        property: "og:description",
        content: "L'agenda événementiel porté par HEMLÉ Magazine : Afrique, diasporas, nations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: APropos,
});

function APropos() {
  return (
    <PublicLayout>
      <div className="hero-gradient relative overflow-hidden">
        <img
          src="/hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-35"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-page relative py-20 text-center">
          <img
            src="/hemle-logo.png"
            alt="Logo HEMLÉ Mag"
            className="mx-auto h-16 w-auto brightness-0 invert"
          />
          <h1 className="mt-6 font-display text-4xl font-bold text-white">À propos de HEMLÉ</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/85">{SITE.tagline}</p>
        </div>
      </div>

      <div className="container-page grid gap-10 py-16 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl font-bold">HEMLÉ Magazine</h2>
          <p className="mt-4 text-muted-foreground">
            HEMLÉ Mag est un magazine dédié à l'Afrique, ses diasporas et ses nations. Il raconte
            les parcours, les initiatives et les réussites qui relient le continent au reste du
            monde.
          </p>
          <p className="mt-4 text-muted-foreground">
            HEMLÉ Events prolonge cette mission sous la forme d'un agenda : rendre visibles les
            événements culturels, économiques, associatifs et institutionnels qui font vivre cette
            communauté, en Afrique comme dans la diaspora.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Comment ça marche</h2>
          <ul className="mt-4 space-y-4 text-muted-foreground">
            <li>
              <strong className="text-foreground">Consultation libre.</strong> Tous les événements
              sont accessibles sans compte ni inscription.
            </li>
            <li>
              <strong className="text-foreground">Recherche et filtres.</strong> Par date, pays,
              ville et catégorie, pour trouver rapidement le bon rendez-vous.
            </li>
            <li>
              <strong className="text-foreground">Proposer un événement.</strong> Via le formulaire
              de proposition ; l'équipe HEMLÉ revient ensuite vers l'organisateur.
            </li>
          </ul>
          <AddEventButton className="mt-6" />
        </section>
      </div>

      <div className="container-page pb-20">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
          <h2 className="font-display text-2xl font-bold">Nous contacter &amp; nous suivre</h2>
          <p className="mt-3 text-muted-foreground">
            Écrivez-nous à{" "}
            <a className="font-medium text-primary hover:underline" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          </p>
          <SocialLinks className="mt-6 justify-center" />
        </div>
      </div>
    </PublicLayout>
  );
}
