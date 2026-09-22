import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export function EventPoster({
  src,
  alt,
  children,
}: {
  src: string | null;
  alt: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; y: number; height: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const viewer = useRef<HTMLDivElement>(null);

  function resize(value: number) {
    setHeight(Math.max(288, Math.min(value, Math.max(288, window.innerHeight * 0.9))));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== event.pointerId) return;
    dragged.current = drag.current.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const control =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      ref={area}
      className="relative h-[42vh] min-h-72 w-full overflow-hidden bg-neutral-900 text-white"
      style={height === null ? undefined : { height }}
    >
      {src ? (
        <Dialog.Root
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            setZoomed(false);
          }}
        >
          <div className="absolute inset-0">
            <img
              src={src}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full scale-110 object-cover blur-2xl"
            />
            <Dialog.Trigger asChild>
              <button
                ref={trigger}
                type="button"
                className="relative block size-full touch-pan-y select-none cursor-zoom-in focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-white active:cursor-grabbing"
                aria-label={`Agrandir l’affiche : ${alt}`}
                onPointerDown={(event) => {
                  dragged.current = false;
                  // Keep native scrolling/pinch zoom on touch screens. Mouse/pen
                  // can drag anywhere on the poster without a separate handle.
                  if (!event.isPrimary || event.button !== 0 || event.pointerType === "touch")
                    return;
                  drag.current = {
                    id: event.pointerId,
                    y: event.clientY,
                    height: area.current!.getBoundingClientRect().height,
                    moved: false,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const current = drag.current;
                  if (!current || current.id !== event.pointerId) return;
                  const delta = event.clientY - current.y;
                  if (Math.abs(delta) > 6) current.moved = true;
                  if (current.moved) resize(current.height + delta);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
                onClick={(event) => {
                  if (dragged.current) {
                    event.preventDefault();
                    dragged.current = false;
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    resize(
                      (area.current?.getBoundingClientRect().height ?? 288) +
                        (event.key === "ArrowDown" ? 80 : -80),
                    );
                  }
                }}
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="size-full object-contain"
                  onError={() => setFailed(true)}
                />
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 to-black/10"
                  aria-hidden="true"
                />
                <span className="absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-black/80 px-4 text-sm font-medium">
                  <Maximize2 className="size-4" aria-hidden="true" /> Voir l’affiche
                </span>
                {failed ? (
                  <span className="absolute inset-x-0 bottom-3 bg-black/80 p-3 text-sm">
                    L’affiche n’a pas pu être chargée.
                  </span>
                ) : null}
              </button>
            </Dialog.Trigger>
          </div>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90" />
            <Dialog.Content
              className="fixed inset-0 z-50 flex h-dvh flex-col bg-neutral-950 text-white focus:outline-none"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus();
              }}
            >
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/15 px-3 py-2 sm:px-6">
                <Dialog.Title className="min-w-0 flex-1 truncate font-display font-semibold">
                  Affiche — {alt}
                </Dialog.Title>
                <button
                  type="button"
                  className={control}
                  onClick={() => {
                    setZoomed((value) => !value);
                    viewer.current?.scrollTo(0, 0);
                  }}
                  aria-pressed={zoomed}
                >
                  {zoomed ? (
                    <ZoomOut className="size-5" aria-hidden="true" />
                  ) : (
                    <ZoomIn className="size-5" aria-hidden="true" />
                  )}
                  {zoomed ? "Ajuster" : "Zoomer"}
                </button>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={control}
                  aria-label="Ouvrir l’image originale dans un nouvel onglet"
                >
                  <ExternalLink className="size-5" aria-hidden="true" />
                </a>
                <Dialog.Close className={control} aria-label="Fermer l’affiche">
                  <X className="size-5" aria-hidden="true" />
                </Dialog.Close>
              </div>
              <Dialog.Description className="px-4 py-2 text-center text-sm text-white/80">
                {zoomed
                  ? "Faites défiler l’affiche pour lire les détails."
                  : "Affiche entière. Utilisez Zoomer pour lire les petits caractères."}
              </Dialog.Description>
              <div
                ref={viewer}
                className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4"
                tabIndex={0}
                aria-label="Affiche agrandie, zone défilante"
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className={
                    zoomed ? "block h-auto w-[200%] max-w-none" : "size-full object-contain"
                  }
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
      <div className="pointer-events-none container-page absolute inset-x-0 bottom-0 pb-8">
        {children}
      </div>
    </div>
  );
}
