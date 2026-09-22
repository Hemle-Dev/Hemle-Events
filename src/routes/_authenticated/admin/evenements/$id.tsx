import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetchAdminEvent, fetchMyAccess, type EventInsert } from "@/lib/admin";
import { saveEventWithImage } from "@/lib/event-save.functions";
import { validateEventImage } from "@/lib/event-image";
import { EVENT_STATUS_LABELS, fetchCategories, slugify, type EventStatus } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/admin/evenements/$id")({
  component: EventEditor,
});

type FormState = {
  titre: string;
  slug: string;
  description: string;
  category_id: string;
  image_url: string;
  image_alt: string;
  date_debut: string;
  heure_debut: string;
  date_fin: string;
  heure_fin: string;
  pays: string;
  ville: string;
  lieu: string;
  organisateur: string;
  organisateur_description: string;
  lien_inscription: string;
  site_web: string;
  type_evenement: string;
  mots_cles: string;
  statut: EventStatus;
  mise_en_avant: boolean;
  published_at: string;
};

const EMPTY: FormState = {
  titre: "",
  slug: "",
  description: "",
  category_id: "",
  image_url: "",
  image_alt: "",
  date_debut: "",
  heure_debut: "",
  date_fin: "",
  heure_fin: "",
  pays: "",
  ville: "",
  lieu: "",
  organisateur: "",
  organisateur_description: "",
  lien_inscription: "",
  site_web: "",
  type_evenement: "",
  mots_cles: "",
  statut: "brouillon",
  mise_en_avant: false,
  published_at: "",
};

function EventEditor() {
  const { id } = Route.useParams();
  return <EventEditorForm key={id} id={id} />;
}

function EventEditorForm({ id }: { id: string }) {
  const isNew = id === "nouveau";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: fetchCategories });
  const access = useQuery({ queryKey: ["admin", "my-access"], queryFn: fetchMyAccess });
  const existing = useQuery({
    queryKey: ["admin", "event", id],
    queryFn: () => fetchAdminEvent(id),
    enabled: !isNew,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const event = existing.data;
    if (!event) return;
    setSlugTouched(true);
    setForm({
      titre: event.titre,
      slug: event.slug,
      description: event.description ?? "",
      category_id: event.category_id ?? "",
      image_url: event.image_url ?? "",
      image_alt: event.image_alt ?? "",
      date_debut: event.date_debut,
      heure_debut: event.heure_debut?.slice(0, 5) ?? "",
      date_fin: event.date_fin ?? "",
      heure_fin: event.heure_fin?.slice(0, 5) ?? "",
      pays: event.pays,
      ville: event.ville,
      lieu: event.lieu ?? "",
      organisateur: event.organisateur ?? "",
      organisateur_description: event.organisateur_description ?? "",
      lien_inscription: event.lien_inscription ?? "",
      site_web: event.site_web ?? "",
      type_evenement: event.type_evenement ?? "",
      mots_cles: (event.mots_cles ?? []).join(", "),
      statut: event.statut,
      mise_en_avant: event.mise_en_avant,
      published_at: event.published_at ? event.published_at.slice(0, 16) : "",
    });
  }, [existing.data]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: EventInsert = {
        titre: form.titre.trim(),
        slug: (form.slug.trim() || slugify(form.titre)).trim(),
        description: form.description.trim(),
        category_id: form.category_id || null,
        image_url: form.image_url.trim() || null,
        image_alt: form.image_alt.trim() || null,
        date_debut: form.date_debut,
        heure_debut: form.heure_debut || null,
        date_fin: form.date_fin || null,
        heure_fin: form.heure_fin || null,
        pays: form.pays.trim(),
        ville: form.ville.trim(),
        lieu: form.lieu.trim() || null,
        organisateur: form.organisateur.trim() || null,
        organisateur_description: form.organisateur_description.trim() || null,
        lien_inscription: form.lien_inscription.trim() || null,
        site_web: form.site_web.trim() || null,
        type_evenement: form.type_evenement.trim() || null,
        mots_cles: form.mots_cles
          .split(",")
          .map((word) => word.trim())
          .filter(Boolean),
        statut: form.statut,
        mise_en_avant: form.mise_en_avant,
        published_at:
          form.statut === "publie"
            ? (existing.data?.published_at ?? new Date().toISOString())
            : form.statut === "programme" && form.published_at
              ? new Date(form.published_at).toISOString()
              : null,
      };
      const data = new FormData();
      if (!isNew) data.set("id", id);
      data.set("values", JSON.stringify(payload));
      if (imageFile) data.set("image", imageFile);
      return saveEventWithImage({ data });
    },
    onSuccess: ({ warning }) => {
      toast.success("Événement enregistré");
      if (warning) toast.warning(warning, { duration: 10000 });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void navigate({ to: "/admin/evenements" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canCreate = access.data?.roles.some(
    (role) => role === "administrateur" || role === "editeur",
  );
  if (isNew && access.data && !canCreate) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="font-display text-2xl font-bold">Création non autorisée</h1>
        <p className="mt-2 text-muted-foreground">
          Votre rôle permet de relire et valider les événements existants, mais pas d’en créer.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/admin/evenements">Retour aux événements</Link>
        </Button>
      </div>
    );
  }

  if (!isNew && existing.isPending) return <p>Chargement de l’événement…</p>;
  if (!isNew && (existing.isError || !existing.data)) {
    return <p role="alert">Impossible de charger cet événement. Rechargez la page.</p>;
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">
          {isNew ? "Nouvel événement" : "Modifier l'événement"}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" type="button">
            <Link to="/admin/evenements" disabled={mutation.isPending}>
              Retour
            </Link>
          </Button>
          {!isNew && form.slug ? (
            <Button asChild variant="outline" type="button">
              <Link to="/evenements/$slug" params={{ slug: form.slug }} target="_blank">
                Prévisualiser
              </Link>
            </Button>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <fieldset disabled={mutation.isPending} className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Contenu</h2>
          <Field label="Titre" required>
            <Input
              required
              value={form.titre}
              onChange={(e) => {
                update("titre", e.target.value);
                if (!slugTouched) update("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Identifiant d'URL (slug)" required>
            <Input
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Description" required>
            <Textarea
              required
              rows={8}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Image principale (URL)">
              <Input
                type="url"
                value={form.image_url}
                onChange={(e) => {
                  setImageFile(null);
                  update("image_url", e.target.value);
                }}
                placeholder="https://…"
              />
            </Field>
            <Field label="Texte alternatif de l'image">
              <Input value={form.image_alt} onChange={(e) => update("image_alt", e.target.value)} />
            </Field>
          </div>
          <Field label="Téléverser une image">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  validateEventImage(file);
                  setImageFile(file);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Image invalide");
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP ou AVIF · 8 Mo maximum. Le fichier est envoyé à l’enregistrement, puis
              l’ancienne image est supprimée si aucun autre événement ne l’utilise.
            </p>
            {imageFile ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="break-all">Nouvelle image : {imageFile.name}</span>
                <Button type="button" variant="outline" onClick={() => setImageFile(null)}>
                  Annuler le remplacement
                </Button>
              </div>
            ) : null}
          </Field>
          {imagePreview || form.image_url ? (
            <img
              src={imagePreview ?? form.image_url}
              alt=""
              className="max-h-56 w-full rounded-xl bg-muted object-contain"
            />
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Publication</h2>
          <Field label="Statut">
            <Select
              value={form.statut}
              onValueChange={(value) => update("statut", value as EventStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {form.statut === "programme" ? (
            <Field label="Date et heure de mise en ligne">
              <Input
                type="datetime-local"
                required
                value={form.published_at}
                onChange={(e) => update("published_at", e.target.value)}
              />
            </Field>
          ) : null}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">Mettre à la une</span>
            <Switch
              checked={form.mise_en_avant}
              onCheckedChange={(checked) => update("mise_en_avant", checked)}
            />
          </div>
          <Field label="Catégorie">
            <Select
              value={form.category_id || "aucune"}
              onValueChange={(value) => update("category_id", value === "aucune" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Aucune</SelectItem>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type d'événement">
            <Input
              value={form.type_evenement}
              onChange={(e) => update("type_evenement", e.target.value)}
              placeholder="Présentiel, en ligne, hybride…"
            />
          </Field>
          <Field label="Mots-clés (séparés par des virgules)">
            <Input value={form.mots_cles} onChange={(e) => update("mots_cles", e.target.value)} />
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Dates et lieu</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Date de début" required>
              <Input
                type="date"
                required
                value={form.date_debut}
                onChange={(e) => update("date_debut", e.target.value)}
              />
            </Field>
            <Field label="Heure de début">
              <Input
                type="time"
                value={form.heure_debut}
                onChange={(e) => update("heure_debut", e.target.value)}
              />
            </Field>
            <Field label="Date de fin">
              <Input
                type="date"
                min={form.date_debut || undefined}
                value={form.date_fin}
                onChange={(e) => update("date_fin", e.target.value)}
              />
            </Field>
            <Field label="Heure de fin">
              <Input
                type="time"
                value={form.heure_fin}
                onChange={(e) => update("heure_fin", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pays" required>
              <Input required value={form.pays} onChange={(e) => update("pays", e.target.value)} />
            </Field>
            <Field label="Ville" required>
              <Input
                required
                value={form.ville}
                onChange={(e) => update("ville", e.target.value)}
              />
            </Field>
            <Field label="Lieu">
              <Input value={form.lieu} onChange={(e) => update("lieu", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Organisateur</h2>
          <Field label="Nom">
            <Input
              value={form.organisateur}
              onChange={(e) => update("organisateur", e.target.value)}
            />
          </Field>
          <Field label="Présentation">
            <Textarea
              rows={4}
              value={form.organisateur_description}
              onChange={(e) => update("organisateur_description", e.target.value)}
            />
          </Field>
          <Field label="Lien d'inscription">
            <Input
              type="url"
              value={form.lien_inscription}
              onChange={(e) => update("lien_inscription", e.target.value)}
            />
          </Field>
          <Field label="Site web">
            <Input
              type="url"
              value={form.site_web}
              onChange={(e) => update("site_web", e.target.value)}
            />
          </Field>
        </section>
      </fieldset>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
