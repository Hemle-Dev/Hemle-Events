export const EVENT_IMAGE_BUCKET = "event-images";

export function validateEventImage(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new Error("Format accepté : JPEG, PNG, WebP ou AVIF.");
  }
  if (!file.size || file.size > 8 * 1024 * 1024) {
    throw new Error("L’image doit être non vide et ne pas dépasser 8 Mo.");
  }
}

// Only objects in this project's bucket can be removed, never external URLs.
export function eventImagePath(value: string | null | undefined, projectUrl: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const project = new URL(projectUrl);
    const prefix = `${project.pathname.replace(/\/$/, "")}/storage/v1/object/public/${EVENT_IMAGE_BUCKET}/`;
    if (url.origin !== project.origin || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

type ImageSaveActions = {
  upload?: () => Promise<string>;
  save: (imageUrl: string | null) => Promise<string>;
  removeIfUnused: (imageUrl: string) => Promise<void>;
};

export async function removeUnusedEventImage(
  imageUrl: string,
  projectUrl: string,
  actions: {
    listReferences: (offset: number, limit: number) => Promise<{ image_url: string | null }[]>;
    remove: (path: string) => Promise<void>;
  },
) {
  const path = eventImagePath(imageUrl, projectUrl);
  if (!path) return;
  for (let offset = 0; ; offset += 500) {
    const references = await actions.listReferences(offset, 500);
    if (references.some((event) => eventImagePath(event.image_url, projectUrl) === path)) return;
    if (references.length < 500) break;
  }
  await actions.remove(path);
}

export async function saveWithEventImage(
  previousUrl: string | null,
  nextUrl: string | null,
  actions: ImageSaveActions,
) {
  // Upload only on Save, so choosing files then cancelling creates no orphan.
  const uploadedUrl = actions.upload ? await actions.upload() : null;
  const imageUrl = uploadedUrl ?? nextUrl;
  let id: string;
  try {
    id = await actions.save(imageUrl);
  } catch (error) {
    if (uploadedUrl) {
      try {
        // A lost network response may hide a successful write: check references first.
        await actions.removeIfUnused(uploadedUrl);
      } catch {
        throw new Error(
          "Enregistrement non confirmé et nettoyage de la nouvelle image impossible. Vérifiez la liste des événements avant de réessayer.",
          { cause: error },
        );
      }
    }
    throw error;
  }
  let warning: string | null = null;
  if (previousUrl && previousUrl !== imageUrl) {
    try {
      await actions.removeIfUnused(previousUrl);
    } catch {
      warning =
        "Événement enregistré, mais l’ancienne image n’a pas pu être supprimée du stockage.";
    }
  }
  return { id, warning };
}
