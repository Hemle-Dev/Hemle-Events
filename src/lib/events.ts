import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { eventToday, nextAnnualDate } from "@/lib/event-dates";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type EventStatus = Database["public"]["Enums"]["event_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type EventWithCategory = EventRow & { categories: CategoryRow | null };
function projectOccurrence(
  event: EventWithCategory & { occurrence_start?: string; occurrence_end?: string },
): EventWithCategory {
  return event.annuel && event.occurrence_start
    ? {
        ...event,
        date_debut: event.occurrence_start,
        date_fin: event.occurrence_end ?? event.occurrence_start,
        date_fin_effective: event.occurrence_end ?? event.occurrence_start,
      }
    : event;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  brouillon: "Brouillon",
  programme: "Programmé",
  publie: "Publié",
  suspendu: "Suspendu",
  archive: "Archivé",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  administrateur: "Administrateur",
  editeur: "Éditeur",
  moderateur: "Modérateur / validation",
};

export const DATE_FILTERS = [
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "demain", label: "Demain" },
  { value: "week-end", label: "Ce week-end" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "prochainement", label: "Prochainement" },
] as const;

export type DateFilter = (typeof DATE_FILTERS)[number]["value"];

const SELECT_WITH_CATEGORY = "*, categories(*)";

function iso(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

export function dateRangeFor(filter: DateFilter): { start: string; end?: string } {
  const now = new Date(`${eventToday()}T12:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "aujourdhui":
      return { start: iso(today), end: iso(today) };
    case "demain": {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return { start: iso(d), end: iso(d) };
    }
    case "week-end": {
      const day = today.getDay(); // 0 dim .. 6 sam
      const toSaturday = (6 - day + 7) % 7;
      const saturday = new Date(today);
      saturday.setDate(saturday.getDate() + toSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      return { start: iso(day === 0 ? today : saturday), end: iso(day === 0 ? today : sunday) };
    }
    case "semaine": {
      const day = (today.getDay() + 6) % 7; // lundi = 0
      const end = new Date(today);
      end.setDate(end.getDate() + (6 - day));
      return { start: iso(today), end: iso(end) };
    }
    case "mois": {
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: iso(today), end: iso(end) };
    }
    case "prochainement":
    default:
      return { start: iso(today) };
  }
}

export type EventFilters = {
  q?: string | undefined;
  date?: DateFilter | undefined;
  pays?: string | undefined;
  ville?: string | undefined;
  categorie?: string | undefined;
  type?: string | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
};

function publicEventsQuery() {
  return supabase
    .from("event_occurrences")
    .select(SELECT_WITH_CATEGORY, { count: "exact" })
    .or(publicStatusFilter());
}

function publicStatusFilter() {
  return `statut.eq.publie,and(statut.eq.programme,published_at.lte.${new Date().toISOString()})`;
}

export async function fetchPublicEvents(filters: EventFilters = {}) {
  const perPage = filters.perPage ?? 12;
  const page = filters.page ?? 1;
  let query = publicEventsQuery();

  const range = dateRangeFor(filters.date ?? "prochainement");
  query = query.gte("occurrence_end", range.start);
  if (range.end) query = query.lte("occurrence_start", range.end);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%,()]/g, " ");
    query = query.or(
      [
        `titre.ilike.%${term}%`,
        `ville.ilike.%${term}%`,
        `pays.ilike.%${term}%`,
        `organisateur.ilike.%${term}%`,
        `description.ilike.%${term}%`,
      ].join(","),
    );
  }
  if (filters.pays) query = query.eq("pays", filters.pays);
  if (filters.ville) query = query.eq("ville", filters.ville);
  if (filters.type) query = query.eq("type_evenement", filters.type);
  if (filters.categorie) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorie)
      .maybeSingle();
    query = query.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const from = (page - 1) * perPage;
  const { data, error, count } = await query
    .order("occurrence_start", { ascending: true })
    .range(from, from + perPage - 1);

  if (error) throw error;
  return {
    events: ((data ?? []) as EventWithCategory[]).map(projectOccurrence),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function fetchHighlights() {
  const today = eventToday();
  const base = () =>
    supabase
      .from("event_occurrences")
      .select(SELECT_WITH_CATEGORY)
      .or(publicStatusFilter())
      .gte("occurrence_end", today);

  const weekend = dateRangeFor("week-end");

  const [aLaUne, ceWeekEnd, prochains] = await Promise.all([
    base().eq("mise_en_avant", true).order("occurrence_start").limit(3),
    base()
      .gte("occurrence_end", weekend.start)
      .lte("occurrence_start", weekend.end!)
      .order("occurrence_start")
      .limit(3),
    base().order("occurrence_start").limit(6),
  ]);

  return {
    aLaUne: ((aLaUne.data ?? []) as EventWithCategory[]).map(projectOccurrence),
    ceWeekEnd: ((ceWeekEnd.data ?? []) as EventWithCategory[]).map(projectOccurrence),
    prochains: ((prochains.data ?? []) as EventWithCategory[]).map(projectOccurrence),
  };
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("ordre");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategoriesWithCounts() {
  const today = eventToday();
  const [cats, events] = await Promise.all([
    fetchCategories(),
    supabase
      .from("event_occurrences")
      .select("category_id")
      .or(publicStatusFilter())
      .gte("occurrence_end", today),
  ]);
  const counts = new Map<string, number>();
  for (const row of events.data ?? []) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return cats.map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }));
}

export async function fetchEventBySlug(slug: string) {
  const { data, error } = await supabase
    .from("event_occurrences")
    .select(SELECT_WITH_CATEGORY)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? projectOccurrence(data as EventWithCategory) : null;
}

export async function fetchSimilarEvents(event: EventWithCategory) {
  const today = eventToday();
  let query = supabase
    .from("event_occurrences")
    .select(SELECT_WITH_CATEGORY)
    .or(publicStatusFilter())
    .neq("id", event.id)
    .gte("occurrence_end", today)
    .order("occurrence_start")
    .limit(3);
  if (event.category_id) query = query.eq("category_id", event.category_id);
  const { data } = await query;
  return ((data ?? []) as EventWithCategory[]).map(projectOccurrence);
}

export async function fetchFilterOptions() {
  const today = eventToday();
  const { data } = await supabase
    .from("event_occurrences")
    .select("pays, ville, type_evenement")
    .or(publicStatusFilter())
    .gte("occurrence_end", today);
  const pays = [...new Set((data ?? []).map((d) => d.pays).filter(Boolean))].sort();
  const villes = [...new Set((data ?? []).map((d) => d.ville).filter(Boolean))].sort();
  const types = [
    ...new Set((data ?? []).map((d) => d.type_evenement).filter(Boolean)),
  ].sort() as string[];
  return { pays, villes, types };
}

/* ---------- formatage ---------- */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(value: string) {
  const d = parseDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDay(value: string) {
  const d = parseDate(value);
  return { day: String(d.getDate()).padStart(2, "0"), month: MONTHS[d.getMonth()]!.slice(0, 4) };
}

export function formatEventDates(
  event: Pick<EventRow, "date_debut" | "date_fin" | "heure_debut" | "heure_fin"> & {
    annuel?: boolean;
  },
) {
  const start = formatDay(event.annuel ? nextAnnualDate(event.date_debut) : event.date_debut);
  const heure = event.heure_debut ? ` · ${event.heure_debut.slice(0, 5)}` : "";
  if (!event.annuel && event.date_fin && event.date_fin !== event.date_debut) {
    return `Du ${start} au ${formatDay(event.date_fin)}`;
  }
  return `${start}${heure}${event.annuel ? " · Chaque année" : ""}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
