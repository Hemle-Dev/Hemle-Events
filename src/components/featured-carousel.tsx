import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import type { EventWithCategory } from "@/lib/events";

export function FeaturedCarousel({ events }: { events: EventWithCategory[] }) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ page: 0, size: 3 });
  const items = events.slice(0, 12);
  const pages = Math.ceil(items.length / position.size);
  useEffect(() => {
    const element = track.current!;
    const measure = () => {
      const size = Number(getComputedStyle(element).getPropertyValue("--cards"));
      const page = Math.max(
        0,
        Math.min(
          Math.ceil(items.length / size) - 1,
          Math.round(element.scrollLeft / (element.clientWidth + 24)),
        ),
      );
      setPosition((previous) =>
        previous.size === size && previous.page === page ? previous : { size, page },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [items.length]);
  const go = (page: number) => {
    track.current?.scrollTo({
      left: Math.max(0, Math.min(pages - 1, page)) * (track.current.clientWidth + 24),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };
  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label="Événements à la une"
      className="min-w-0"
    >
      <div
        ref={track}
        id={id}
        tabIndex={0}
        aria-label="Événements à la une, utiliser les flèches pour parcourir"
        className="grid auto-cols-[100%] grid-flow-col gap-6 overflow-x-auto overscroll-x-contain snap-x snap-mandatory py-2 [--cards:1] sm:auto-cols-[calc((100%-24px)/2)] sm:[--cards:2] lg:auto-cols-[calc((100%-48px)/3)] lg:[--cards:3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        style={{ scrollbarWidth: "none" }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            go(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? pages - 1
                  : position.page + (event.key === "ArrowRight" ? 1 : -1),
            );
          }
        }}
      >
        {items.map((event, index) => (
          <div
            key={event.id}
            className={`min-w-0 ${index % position.size === 0 ? "snap-start" : ""}`}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${index + 1} sur ${items.length}`}
          >
            <EventCard event={event} />
          </div>
        ))}
        {Array.from(
          { length: (position.size - (items.length % position.size)) % position.size },
          (_, i) => (
            <div key={`space-${i}`} aria-hidden="true" />
          ),
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="size-11 p-0"
            aria-label="Événements à la une précédents"
            aria-controls={id}
            disabled={position.page === 0}
            onClick={() => go(position.page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span
            className="min-w-16 text-center text-sm tabular-nums text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {position.page + 1} / {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="size-11 p-0"
            aria-label="Événements à la une suivants"
            aria-controls={id}
            disabled={position.page >= pages - 1}
            onClick={() => go(position.page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
