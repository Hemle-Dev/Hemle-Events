export const ACCOUNT_EMAIL_DOMAIN = "accounts.hemle.invalid";

export function normalizeIdentifier(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 48);
}

export function identifierToEmail(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) throw new Error("L’identifiant est invalide.");
  return `${normalized}@${ACCOUNT_EMAIL_DOMAIN}`;
}

export function isValidIdentifier(value: string) {
  const normalized = normalizeIdentifier(value);
  return normalized.length >= 3 && normalized === value.trim();
}
