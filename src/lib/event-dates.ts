export function eventToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function nextAnnualDate(start: string, today = eventToday()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(today) ||
    !Number.isFinite(Date.parse(start)) ||
    new Date(start).toISOString().slice(0, 10) !== start
  ) {
    throw new Error("Date annuelle invalide.");
  }
  const [firstYear, month, day] = start.split("-").map(Number);
  for (let year = Math.max(firstYear!, Number(today.slice(0, 4))); year < 10000; year++) {
    const candidate = new Date(Date.UTC(year, month! - 1, day));
    if (candidate.getUTCMonth() !== month! - 1) continue; // Feb 29: leap years only.
    const date = candidate.toISOString().slice(0, 10);
    if (date >= today && date >= start) return date;
  }
  throw new Error("Date annuelle invalide.");
}

export function canFeatureEvent(
  event: { date_debut: string; date_fin: string | null; annuel?: boolean },
  today = eventToday(),
) {
  return (
    (event.annuel ? nextAnnualDate(event.date_debut, today) : event.date_fin || event.date_debut) >=
    today
  );
}
