import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole, EventStatus, EventWithCategory } from "@/lib/events";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function fetchMyAccess() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { user: null, profile: null, roles: [] as AppRole[] };

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    user,
    profile: (profile as ProfileRow | null) ?? null,
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}

export async function fetchAdminEvents(
  filters: { q?: string; statut?: EventStatus | "tous" } = {},
) {
  let query = supabase
    .from("events")
    .select("*, categories(*)")
    .order("date_debut", { ascending: false })
    .limit(200);

  if (filters.statut && filters.statut !== "tous") query = query.eq("statut", filters.statut);
  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%,()]/g, " ");
    query = query.or(`titre.ilike.%${term}%,ville.ilike.%${term}%,organisateur.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventWithCategory[];
}

export async function fetchAdminEvent(id: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*, categories(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EventWithCategory | null) ?? null;
}

export async function fetchAdminStats() {
  const today = new Date().toISOString().slice(0, 10);
  const counts: Record<string, number> = {};
  const statuses: EventStatus[] = ["brouillon", "programme", "publie", "suspendu", "archive"];

  await Promise.all(
    statuses.map(async (statut) => {
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("statut", statut);
      counts[statut] = count ?? 0;
    }),
  );

  const { count: aVenir } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("statut", "publie")
    .gte("date_fin_effective", today);

  return { counts, aVenir: aVenir ?? 0 };
}

export async function setEventStatus(id: string, statut: EventStatus, publishedAt?: string | null) {
  const patch: EventUpdate = { statut };
  if (statut === "publie") patch.published_at = new Date().toISOString();
  if (statut === "programme") patch.published_at = publishedAt ?? null;
  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTeam() {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw error;
  const byUser = new Map<string, AppRole[]>();
  for (const row of roles ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row.role as AppRole);
    byUser.set(row.user_id, list);
  }
  return (profiles ?? []).map((p) => ({ ...(p as ProfileRow), roles: byUser.get(p.id) ?? [] }));
}

export async function saveCategory(
  id: string | null,
  values: { nom: string; slug: string; description: string | null; ordre: number },
) {
  if (id) {
    const { error } = await supabase.from("categories").update(values).eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("categories").insert(values);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
