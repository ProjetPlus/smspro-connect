import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toE164 } from "./cedeao";
import { assertPasswordAllowed } from "./password.server";

/**
 * Création de compte simplifiée : identité seule.
 * Le compte est créé et immédiatement utilisable ; la propriété du numéro est
 * confirmée ensuite par un code à 6 chiffres (voir phone-otp.functions).
 */
export const createSignupAccount = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(320),
        password: z.string().min(10).max(200),
        first_name: z.string().trim().min(1).max(120),
        last_name: z.string().trim().min(1).max(120),
        dial_code: z.string().trim().min(2).max(6),
        phone: z.string().trim().min(5).max(30),
        country: z.string().trim().min(1).max(80),
        city: z.string().trim().max(120).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const policyError = await assertPasswordAllowed(data.password);
    if (policyError) return { ok: false as const, error: policyError };

    const email = data.email.toLowerCase();
    const phone_e164 = toE164(data.dial_code, data.phone);
    const full_name = `${data.first_name} ${data.last_name}`.trim();

    const user_metadata = {
      full_name,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: phone_e164,
      phone_e164,
      dial_code: data.dial_code,
      country: data.country,
      city: data.city ?? "",
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
        email_confirm: true,
        user_metadata,
      });
      if (error) {
        if (isDuplicate(error.message)) {
          return {
            ok: false as const,
            error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous pour continuer.",
          };
        }
        return { ok: false as const, error: "Création du compte impossible pour le moment. Réessayez dans un instant." };
      }

      // Complète le profil (le déclencheur a déjà créé la ligne).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (created.user?.id) {
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name,
            phone: phone_e164,
            phone_e164,
            dial_code: data.dial_code,
            country: data.country,
            city: data.city ?? null,
            account_status: "pending_verification",
          })
          .eq("id", created.user.id);
      }

      try {
        const { sendWelcomeEmail } = await import("./emails.server");
        await sendWelcomeEmail(email, data.first_name);
      } catch {
        /* l'e-mail de bienvenue ne doit jamais bloquer l'inscription */
      }

      return { ok: true as const, user_id: created.user?.id ?? null };
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
        return {
          ok: false as const,
          error: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous pour continuer.",
        };
      }
      return { ok: false as const, error: "Création du compte impossible pour le moment. Réessayez dans un instant." };
    }
    return { ok: true as const, user_id: signed.user?.id ?? null };
  });
