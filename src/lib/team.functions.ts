import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["administrateur", "editeur", "moderateur"] as const;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrateur",
  });
  if (error || !data) throw new Error("Action réservée aux administrateurs.");
}

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        nom: z.string().min(1),
        prenom: z.string().min(1),
        role: z.enum(ROLES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom, prenom: data.prenom },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Création impossible.");

    const userId = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, nom: data.nom, prenom: data.prenom, actif: true });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { id: userId };
  });

export const setTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTeamMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), actif: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ actif: data.actif })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
