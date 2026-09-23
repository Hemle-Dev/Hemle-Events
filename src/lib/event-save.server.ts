import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "../integrations/supabase/client.server.ts";
import { EVENT_IMAGE_BUCKET, removeUnusedEventImage, saveWithEventImage } from "./event-image.ts";
import { eventSlugCandidate } from "./event-slug.ts";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

async function removeIfUnused(imageUrl: string) {
  const projectUrl = process.env["SUPABASE_URL"]!;
  // Read all statuses with the server client, including events hidden by RLS.
  // Normalize URLs to also protect shared images with ?cache/version parameters.
  return removeUnusedEventImage(imageUrl, projectUrl, {
    listReferences: async (offset, limit) => {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select("id, image_url")
        .not("image_url", "is", null)
        .order("id")
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data;
    },
    remove: async (path) => {
      const { error } = await supabaseAdmin.storage.from(EVENT_IMAGE_BUCKET).remove([path]);
      if (error) throw error;
    },
  });
}

export async function persistEventWithImage(
  client: SupabaseClient<Database>,
  id: string | null,
  values: EventInsert,
  file: File | null,
) {
  let previous: { image_url: string | null; updated_at: string } | null = null;
  if (id) {
    const { data, error } = await client
      .from("events")
      .select("image_url, updated_at")
      .eq("id", id)
      .single();
    if (error) throw error;
    previous = data;
  }
  return saveWithEventImage(previous?.image_url ?? null, values.image_url ?? null, {
    ...(file
      ? {
          upload: async () => {
            const extension = {
              "image/jpeg": "jpg",
              "image/png": "png",
              "image/webp": "webp",
              "image/avif": "avif",
            }[file.type];
            const path = `${new Date().getFullYear()}/${randomUUID()}.${extension}`;
            // Upload and event writes retain the caller's RLS permissions.
            const { error } = await client.storage.from(EVENT_IMAGE_BUCKET).upload(path, file, {
              cacheControl: "31536000",
              contentType: file.type,
              upsert: false,
            });
            if (error) throw error;
            return client.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
          },
        }
      : {}),
    save: async (imageUrl) => {
      const payload = { ...values, image_url: imageUrl };
      for (let attempt = 0; attempt < 100; attempt++) {
        const query = id
          ? client
              .from("events")
              .update(payload)
              .eq("id", id)
              .eq("updated_at", previous!.updated_at)
          : client.from("events").insert({
              ...payload,
              slug: eventSlugCandidate(values.slug, values.organisateur, attempt),
            });
        const { data, error } = await query.select("id").single();
        if (!error) return data.id;
        if (error.code === "23505" && /slug/i.test(`${error.message} ${error.details}`)) {
          if (!id) continue; // Unique constraint arbitrates even concurrent creations.
          throw new Error(
            "Cette URL est déjà utilisée. Choisissez un identifiant d’URL différent ; l’événement existant n’a pas été modifié.",
          );
        }
        throw new Error(
          "Enregistrement impossible ou événement modifié entre-temps. Rechargez la fiche et réessayez.",
          { cause: error },
        );
      }
      throw new Error(
        "Impossible de réserver une URL unique. Précisez un autre identifiant d’URL.",
      );
    },
    // The client never supplies an arbitrary deletion target: only the previous
    // persisted URL or the object uploaded by this invocation reaches cleanup.
    removeIfUnused,
  });
}
