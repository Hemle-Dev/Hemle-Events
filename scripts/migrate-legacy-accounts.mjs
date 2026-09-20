import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: profiles, error } = await supabase.from("profiles").select("id, identifiant");
if (error) throw error;

for (const profile of profiles ?? []) {
  if (!profile.identifiant) continue;
  const email = `${profile.identifiant.toLowerCase()}@accounts.hemle.invalid`;
  const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, { email });
  if (updateError) throw new Error(`${profile.identifiant}: ${updateError.message}`);
  const { error: clearError } = await supabase
    .from("profiles")
    .update({ email: null })
    .eq("id", profile.id);
  if (clearError) throw clearError;
  console.log(`Compte « ${profile.identifiant} » migré.`);
}
