import { useRef, useState, useEffect, type ComponentProps } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DateTimeInput({
  type = "date",
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & { type?: "date" | "time" | "datetime-local" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [canPick, setCanPick] = useState(false);
  useEffect(() => setCanPick(typeof ref.current?.showPicker === "function"), []);
  return (
    <div className="flex w-full min-w-0 max-w-72 items-center gap-1">
      <Input
        {...props}
        type={type}
        ref={ref}
        className={`h-11 min-w-0 flex-1 ${canPick ? "[&::-webkit-calendar-picker-indicator]:hidden" : ""}`}
      />
      {canPick ? (
        <button
          type="button"
          disabled={props.disabled}
          aria-label={`Choisir ${props["aria-label"] || (type === "time" ? "l’heure" : "la date")}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          onClick={() => {
            try {
              ref.current?.showPicker();
            } catch {
              ref.current?.focus();
            }
          }}
        >
          {type === "time" ? (
            <Clock className="size-5" aria-hidden="true" />
          ) : (
            <CalendarDays className="size-5" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}
