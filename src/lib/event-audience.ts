export const EVENT_AUDIENCES = [
  { value: "afrique", label: "Afrique" },
  { value: "diaspora", label: "Diaspora" },
] as const;
export type EventAudience = (typeof EVENT_AUDIENCES)[number]["value"];
export function eventAudience(value: unknown): EventAudience | undefined {
  return value === "afrique" || value === "diaspora" ? value : undefined;
}
export function audienceLabel(value: unknown) {
  return EVENT_AUDIENCES.find((item) => item.value === value)?.label;
}
