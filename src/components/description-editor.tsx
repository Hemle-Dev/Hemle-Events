import { useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EventDescription } from "@/components/event-description";
import { formatBulletSelection, formatSelection } from "@/lib/description";

export function DescriptionEditor({
  value,
  format,
  onChange,
}: {
  value: string;
  format: string;
  onChange: (value: string, format: "plain" | "formatted") => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="min-w-0 space-y-2">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Mise en forme de la description"
      >
        {(
          [
            { tag: "b", label: "Gras", Icon: Bold },
            { tag: "i", label: "Italique", Icon: Italic },
            { tag: "u", label: "Souligné", Icon: Underline },
            { tag: "list", label: "Liste à puces", Icon: List },
          ] as const
        ).map(({ tag, label, Icon }) => (
          <Button
            key={tag}
            type="button"
            variant="outline"
            className="min-h-11"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const field = input.current!;
              const next =
                tag === "list"
                  ? formatBulletSelection(value, field.selectionStart, field.selectionEnd)
                  : formatSelection(value, field.selectionStart, field.selectionEnd, tag);
              onChange(next.value, "formatted");
              requestAnimationFrame(() => {
                field.focus();
                field.setSelectionRange(next.start, next.end);
              });
            }}
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
      <Textarea
        id="event-description"
        ref={input}
        required
        rows={8}
        value={value}
        aria-label="Description"
        aria-describedby="description-help"
        onChange={(e) => onChange(e.target.value, format === "formatted" ? "formatted" : "plain")}
      />
      <p id="description-help" className="text-xs text-muted-foreground">
        Sélectionnez du texte puis choisissez un style. Les balises [b], [i] et [u] sont remplacées
        par leur mise en forme dans l’aperçu et sur le site. Pour les puces, sélectionnez une ou
        plusieurs lignes puis cliquez sur « Liste à puces ». Chaque ligne commence par « - ». Un
        second clic retire les puces.
      </p>
      <details className="rounded-lg border border-border p-3" open>
        <summary className="cursor-pointer text-sm font-medium">Aperçu de la description</summary>
        <div className="mt-3">
          <EventDescription value={value} format={format} />
        </div>
      </details>
    </div>
  );
}
