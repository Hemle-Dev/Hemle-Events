import { Check, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some browsers deny Clipboard API access; try the legacy user gesture.
    }
  }
  const previous = document.activeElement;
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.append(input);
  try {
    input.select();
    if (!document.execCommand("copy")) throw new Error("Copie refusée");
  } finally {
    input.remove();
    if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  }
}

export function CopyEventLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setCopied(false);
    setError("");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [url]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className={copied ? "size-11 border-primary text-primary" : "size-11"}
        aria-label={copied ? "Lien copié" : "Copier le lien"}
        title={copied ? "Lien copié !" : "Copier le lien"}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          if (timer.current) clearTimeout(timer.current);
          try {
            await copyText(url);
            setCopied(true);
            toast.success("Lien copié dans le presse-papiers");
            timer.current = setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
            setError("Copie impossible. Copiez le lien depuis la barre d’adresse.");
            toast.error("Impossible de copier le lien");
          } finally {
            setPending(false);
          }
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      </Button>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          copied
            ? "absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
            : "sr-only"
        }
      >
        {copied ? "Lien copié !" : error}
      </span>
    </div>
  );
}
