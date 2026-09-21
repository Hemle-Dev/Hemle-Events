import { Link } from "@tanstack/react-router";
import { Menu, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GOOGLE_FORM_URL, NAV_LINKS } from "@/lib/site";

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary data-[status=active]:text-primary"
          activeOptions={{ exact: link.to === "/" }}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function AddEventButton({
  size = "default",
  variant = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer noopener">
        <Plus aria-hidden="true" />
        Ajouter mon événement
      </a>
    </Button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="HEMLÉ Events, accueil"
        >
          <img
            src="/hemle-logo.png?v=20260921"
            alt="Logo HEMLÉ Mag"
            width={1080}
            height={616}
            loading="eager"
            className="block h-12 w-[84px] shrink-0 object-contain"
          />
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
            Events
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          <NavItems />
        </nav>

        <div className="flex items-center gap-2">
          <AddEventButton size="sm" className="hidden sm:inline-flex" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="text-left">Navigation</SheetTitle>
              <nav className="mt-6 flex flex-col gap-3" aria-label="Navigation mobile">
                <NavItems onNavigate={() => setOpen(false)} />
              </nav>
              <div className="mt-6">
                <AddEventButton className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="border-t border-border/70 px-5 py-2 sm:hidden">
        <AddEventButton size="sm" className="w-full" />
      </div>
    </header>
  );
}
