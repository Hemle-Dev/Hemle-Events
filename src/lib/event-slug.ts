function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function eventSlugCandidate(
  slug: string,
  organizer: string | null | undefined,
  attempt: number,
) {
  const base = normalize(slug).slice(0, 80) || "evenement";
  if (attempt === 0) return base;
  const promoter = normalize(organizer || "").slice(0, 40);
  const suffix = `${promoter ? `-${promoter}` : ""}${attempt > 1 || !promoter ? `-${attempt + 1}` : ""}`;
  return `${base.slice(0, 120 - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
