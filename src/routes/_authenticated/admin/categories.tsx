import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteCategory, saveCategory } from "@/lib/admin";
import { fetchCategoriesWithCounts, slugify, type CategoryRow } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

type CategoryForm = { nom: string; slug: string; description: string; ordre: number };
const EMPTY: CategoryForm = { nom: "", slug: "", description: "", ordre: 0 };

function AdminCategories() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CategoryRow | null | undefined>(undefined);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const categories = useQuery({
    queryKey: ["admin", "categories", "counts"],
    queryFn: () => fetchCategoriesWithCounts(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });
  const save = useMutation({
    mutationFn: () =>
      saveCategory(editing?.id ?? null, {
        nom: form.nom.trim(),
        slug: slugify(form.slug || form.nom),
        description: form.description.trim() || null,
        ordre: Number(form.ordre) || 0,
      }),
    onSuccess: () => {
      toast.success(editing ? "Catégorie mise à jour" : "Catégorie créée");
      setEditing(undefined);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Catégorie supprimée");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function open(category: CategoryRow | null) {
    setEditing(category);
    setForm(
      category
        ? {
            nom: category.nom,
            slug: category.slug,
            description: category.description ?? "",
            ordre: category.ordre,
          }
        : { ...EMPTY, ordre: (categories.data?.length ?? 0) + 1 },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <p className="eyebrow">Taxonomie</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Catégories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organisez le catalogue public et son ordre d’affichage.
          </p>
        </div>
        <Button className="ml-auto" onClick={() => open(null)}>
          <Plus aria-hidden="true" /> Nouvelle catégorie
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[72px_1fr_120px_120px] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>Ordre</span>
          <span>Catégorie</span>
          <span>Événements</span>
          <span className="text-right">Actions</span>
        </div>
        <ul className="divide-y divide-border">
          {(categories.data ?? []).map((category) => (
            <li
              key={category.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[72px_1fr_120px_120px] md:items-center"
            >
              <span className="text-sm tabular-nums text-muted-foreground">{category.ordre}</span>
              <div>
                <p className="font-medium">{category.nom}</p>
                <p className="text-sm text-muted-foreground">/{category.slug}</p>
              </div>
              <span className="text-sm">{category.count}</span>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Modifier ${category.nom}`}
                  onClick={() => open(category)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Supprimer ${category.nom}`}
                  onClick={() => {
                    if (
                      confirm(
                        `Supprimer « ${category.nom} » ? Les événements associés resteront sans catégorie.`,
                      )
                    )
                      remove.mutate(category.id);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
          {categories.isLoading ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">Chargement…</li>
          ) : null}
        </ul>
      </div>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(openState) => !openState && setEditing(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
            <DialogDescription>
              Le slug est utilisé dans les URL et les filtres publics.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="category-name">Nom</Label>
              <Input
                id="category-name"
                required
                value={form.nom}
                onChange={(event) => setForm({ ...form, nom: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  placeholder={slugify(form.nom)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-order">Ordre</Label>
                <Input
                  id="category-order"
                  type="number"
                  min="0"
                  value={form.ordre}
                  onChange={(event) => setForm({ ...form, ordre: Number(event.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(undefined)}>
                Annuler
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
