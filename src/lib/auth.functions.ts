import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { identifierToEmail, normalizeIdentifier } from "@/lib/account";

export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        identifier: z.string().min(3).max(48),
        password: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("La configuration Supabase du serveur est incomplète.");

    const identifier = normalizeIdentifier(data.identifier);
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error } = await client.auth.signInWithPassword({
      email: identifierToEmail(identifier),
      password: data.password,
    });

    if (error || !authData.session) {
      throw new Error("Identifiant ou mot de passe incorrect.");
    }

    const { data: access } = await client
      .from("profiles")
      .select("actif")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!access?.actif) {
      await client.auth.signOut();
      throw new Error("Ce compte est désactivé.");
    }

    return {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  });
