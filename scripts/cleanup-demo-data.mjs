import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { count, error: countError } = await supabase
  .from("events")
  .select("id", { count: "exact", head: true })
  .eq("demo", true);
if (countError) throw countError;

if (!apply) {
  console.log(`${count ?? 0} événement(s) de démonstration seraient supprimés.`);
  console.log("Relancez avec --apply et CONFIRM_CLEANUP=DELETE_DEMO_DATA pour confirmer.");
  process.exit(0);
}
if (process.env.CONFIRM_CLEANUP !== "DELETE_DEMO_DATA") {
  throw new Error("Confirmation absente : définissez CONFIRM_CLEANUP=DELETE_DEMO_DATA.");
}

const { error } = await supabase.from("events").delete().eq("demo", true);
if (error) throw error;
console.log(
  `${count ?? 0} événement(s) de démonstration supprimés. Les catégories ont été conservées.`,
);
