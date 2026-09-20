import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { identifierToEmail, normalizeIdentifier } from "@/lib/account";

const ROLES = ["administrateur", "editeur", "moderateur"] as const;

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrateur",
  });
  if (error || !data) throw new Error("Action réservée aux administrateurs.");
}

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        identifier: z.string().min(3).max(48),
        password: z.string().min(12).max(128),
        nom: z.string().min(1),
        prenom: z.string().min(1),
        role: z.enum(ROLES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identifier = normalizeIdentifier(data.identifier);
    if (identifier.length < 3) throw new Error("L’identifiant est invalide.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: identifierToEmail(identifier),
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom, prenom: data.prenom, identifiant: identifier },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Création impossible.");

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: null,
      identifiant: identifier,
      nom: data.nom,
      prenom: data.prenom,
      actif: true,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleError.message);
    }

    return { id: userId };
  });

export const setTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    const { error: cleanupError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .neq("role", data.role);
    if (cleanupError) throw new Error(cleanupError.message);
    return { ok: true };
  });

export const setTeamMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ userId: z.string().uuid(), actif: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas désactiver votre propre compte.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ actif: data.actif })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(12).max(128) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
