import React from "react";
import { createRoot } from "react-dom/client";
import { EventPoster } from "../../src/components/event-poster";
import { CopyEventLink } from "../../src/components/copy-event-link";
import "../../src/styles.css";

const poster = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#fff"/><rect x="40" y="40" width="720" height="1120" rx="20" fill="#073c43"/><text x="400" y="230" text-anchor="middle" font-family="sans-serif" font-size="68" fill="white">HEMLÉ EVENTS</text><text x="400" y="550" text-anchor="middle" font-family="sans-serif" font-size="40" fill="white">Affiche de test</text><text x="400" y="1080" text-anchor="middle" font-family="sans-serif" font-size="20" fill="white">Petits caractères à lire avec le zoom</text></svg>')}`;

createRoot(document.getElementById("root")!).render(
  <>
    <EventPoster src={poster} alt="Affiche de test">
      <span className="rounded-full bg-primary px-3 py-1 text-sm">Culture</span>
      <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold text-white sm:text-5xl">
        Événement de test — aucun accès à la base
      </h1>
    </EventPoster>
    <div className="container-page py-12">
      <CopyEventLink url="https://example.test/evenements/affiche-test" />
    </div>
  </>,
);
