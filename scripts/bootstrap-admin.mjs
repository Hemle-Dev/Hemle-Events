import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawIdentifier = process.env.BOOTSTRAP_ADMIN_ID;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const forcePassword = process.env.BOOTSTRAP_ADMIN_FORCE_PASSWORD === "true";

function normalizeIdentifier(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 48);
}

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
}
if (!rawIdentifier) throw new Error("BOOTSTRAP_ADMIN_ID est requis.");

const identifier = normalizeIdentifier(rawIdentifier);
if (identifier.length < 3)
  throw new Error("BOOTSTRAP_ADMIN_ID doit contenir au moins 3 caractères.");
const email = `${identifier}@accounts.hemle.invalid`;
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingProfile, error: profileLookupError } = await supabase
  .from("profiles")
  .select("id")
  .eq("identifiant", identifier)
  .maybeSingle();
if (profileLookupError) throw profileLookupError;

let userId = existingProfile?.id;
if (!userId) {
  if (!password || password.length < 12) {
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD doit contenir au moins 12 caractères pour créer le compte initial.",
    );
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { identifiant: identifier, nom: "Administrateur", prenom: "HEMLÉ" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Création du compte impossible.");
  userId = data.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    identifiant: identifier,
    email: null,
    nom: "Administrateur",
    prenom: "HEMLÉ",
    actif: true,
  });
  if (profileError) throw profileError;
  console.log(`Compte administrateur « ${identifier} » créé.`);
} else {
  const identityPatch = { email, ...(forcePassword ? { password } : {}) };
  if (forcePassword && (!password || password.length < 12)) {
    throw new Error("Le nouveau mot de passe doit contenir au moins 12 caractères.");
  }
  const { error: identityError } = await supabase.auth.admin.updateUserById(userId, identityPatch);
  if (identityError) throw identityError;
  const { error: activeError } = await supabase
    .from("profiles")
    .update({ actif: true })
    .eq("id", userId);
  if (activeError) throw activeError;
  if (forcePassword) {
    console.log(`Mot de passe du compte « ${identifier} » remplacé.`);
  } else {
    console.log(`Le compte administrateur « ${identifier} » existe déjà ; mot de passe inchangé.`);
  }
}

const { error: roleError } = await supabase
  .from("user_roles")
  .upsert({ user_id: userId, role: "administrateur" }, { onConflict: "user_id,role" });
if (roleError) throw roleError;

console.log("Rôle administrateur vérifié.");
