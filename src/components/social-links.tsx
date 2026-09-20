import { Facebook, Globe, Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";

import { SITE } from "@/lib/site";

export const SOCIALS = [
  { href: SITE.facebook, label: "Facebook HEMLÉ", Icon: Facebook },
  { href: SITE.instagram, label: "Instagram HEMLÉ", Icon: Instagram },
  { href: SITE.linkedin, label: "LinkedIn HEMLÉ", Icon: Linkedin },
  { href: SITE.whatsapp, label: "WhatsApp HEMLÉ", Icon: MessageCircle },
  { href: SITE.magazine, label: "Site HEMLÉ Magazine", Icon: Globe },
  { href: `mailto:${SITE.email}`, label: `Écrire à ${SITE.email}`, Icon: Mail },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-3 ${className}`}>
      {SOCIALS.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
            title={label}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Icon className="size-4" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
