import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertPasswordAllowed } from "./password.server";

/**
 * Crée le compte client SANS confirmer l'email : la propriété de l'adresse doit
 * être prouvée par un code à usage unique envoyé par email (voir /inscription).
 * Aucune session n'est délivrée ici.
 *
 * Deux chemins possibles, pour que l'inscription fonctionne dans tous les
 * environnements de déploiement :
 *  1. clé service_role disponible  -> Auth Admin API (createUser)
 *  2. sinon                        -> signUp via la clé publiable (anon)
 */
export const createSignupAccount = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(320),
        password: z.string().min(10).max(200),
        full_name: z.string().trim().max(240).optional(),
        phone: z.string().trim().max(30).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const policyError = await assertPasswordAllowed(data.password);
    if (policyError) return { ok: false as const, error: policyError };

    const email = data.email.toLowerCase();
    const user_metadata = {
      full_name: data.full_name ?? "",
      phone: data.phone ?? "",
      gdpr_consent_at: new Date().toISOString(),
    };

    const isDuplicate = (message: string) => {
      const m = message.toLowerCase();
      return m.includes("already") || m.includes("exists") || m.includes("registered");
    };

    const { tryGetSupabaseAdmin, createAnonServerClient } = await import("./supabase-config.server");
    const admin = await tryGetSupabaseAdmin();

    if (admin) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: false,
        user_metadata,
      });
      if (error) {
        if (isDuplicate(error.message)) {
          return { ok: true as const, exists: true as const, requires_verification: true as const, user_id: null };
        }
        return { ok: false as const, error: error.message };
      }
      return {
        ok: true as const,
        exists: false as const,
        requires_verification: true as const,
        user_id: created.user?.id ?? null,
      };
    }

    // Repli sans clé service_role : inscription publique standard.
    const anon = createAnonServerClient();
    const { data: signed, error } = await anon.auth.signUp({
      email,
      password: data.password,
      options: { data: user_metadata },
    });
    if (error) {
      if (isDuplicate(error.message)) {
        return { ok: true as const, exists: true as const, requires_verification: true as const, user_id: null };
      }
      return { ok: false as const, error: error.message };
    }
    return {
      ok: true as const,
      exists: (signed.user?.identities?.length ?? 1) === 0,
      requires_verification: true as const,
      user_id: signed.user?.id ?? null,
    };
  });
