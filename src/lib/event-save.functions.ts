import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateEventImage } from "@/lib/event-image";

const optionalText = z.string().nullable();
const optionalUrl = z
  .string()
  .url()
  .regex(/^https?:\/\//)
  .nullable();
const eventValues = z.object({
  titre: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  description_format: z.enum(["plain", "formatted"]).default("plain"),
  annuel: z.boolean().default(false),
  category_id: z.string().uuid().nullable(),
  image_url: optionalUrl,
  image_alt: optionalText,
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure_debut: optionalText,
  date_fin: optionalText,
  heure_fin: optionalText,
  pays: z.string().min(1),
  ville: z.string().min(1),
  lieu: optionalText,
  organisateur: optionalText,
  organisateur_description: optionalText,
  lien_inscription: optionalUrl,
  site_web: optionalUrl,
  type_evenement: optionalText,
  mots_cles: z.array(z.string()),
  statut: z.enum(["brouillon", "programme", "publie", "suspendu", "archive"]),
  mise_en_avant: z.boolean(),
  published_at: optionalText,
});

export const saveEventWithImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Formulaire invalide.");
    const id = z.string().uuid().nullable().parse(input.get("id"));
    const values = eventValues.parse(JSON.parse(String(input.get("values"))));
    if (values.annuel && values.date_fin && values.date_fin !== values.date_debut) {
      throw new Error("Un événement annuel à date fixe doit se dérouler sur une seule journée.");
    }
    const file = input.get("image");
    if (file !== null && !(file instanceof File)) throw new Error("Image invalide.");
    if (file) validateEventImage(file);
    return { id, values, file };
  })
  .handler(async ({ data, context }) => {
    const { data: staff, error } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (error || !staff) throw new Error("Action réservée à un membre actif de l’équipe.");
    const { persistEventWithImage } = await import("@/lib/event-save.server");
    return persistEventWithImage(context.supabase, data.id, data.values, data.file);
  });
