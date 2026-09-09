import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 6;

async function hashCode(code: string, userId: string): Promise<string> {
  const { createHash } = await import("crypto");
  const pepper = process.env["OTP_PEPPER"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "sms-pro-mobile";
  return createHash("sha256").update(`${userId}:${code}:${pepper}`).digest("hex");
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Envoie un code à 6 chiffres par SMS (repli e-mail) au numéro du profil. */
export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, phone_e164, phone, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    const phone = (profile?.phone_e164 || profile?.phone || "").trim();
    const email = profile?.email ?? "";
    if (!phone && !email) {
      return { ok: false as const, error: "Aucun numéro ni e-mail enregistré sur ce compte." };
    }

    const code = generateCode();
    const code_hash = await hashCode(code, context.userId);
    const expires_at = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    let channel: "sms" | "email" = "sms";
    let delivered = false;

    if (phone) {
      const { sendSms } = await import("./sms-providers.server");
      const result = await sendSms({
        to: phone,
        from: process.env["NTOUCH_SENDER"] ?? "SMSPRO",
        message: `SMS Pro Mobile : votre code de verification est ${code}. Valable ${CODE_TTL_MINUTES} minutes.`,
      });
      delivered = result.status !== "failed";
    }

    if (!delivered && email) {
      const { sendOtpEmail } = await import("./emails.server");
      const result = await sendOtpEmail(email, code);
      delivered = result.sent;
      channel = "email";
    }

    await supabaseAdmin.from("phone_verifications").insert({
      user_id: context.userId,
      phone: phone || email,
      code_hash,
      channel,
      expires_at,
    } as never);

    if (!delivered) {
      return {
        ok: false as const,
        error:
          "Nous n'avons pas pu envoyer le code pour le moment. Réessayez dans un instant ou contactez le support.",
      };
    }

    return { ok: true as const, channel, destination: channel === "sms" ? phone : email };
  });

/** Vérifie le code reçu et active le compte. */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ code: z.string().trim().regex(/^\d{6}$/) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", context.userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "Aucun code en attente. Demandez un nouveau code." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "Ce code a expiré. Demandez-en un nouveau." };
    }
    if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
      return { ok: false as const, error: "Trop de tentatives. Demandez un nouveau code." };
    }

    const expected = await hashCode(data.code, context.userId);
    if (expected !== row.code_hash) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false as const, error: "Code incorrect. Vérifiez et réessayez." };
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from("phone_verifications").update({ consumed_at: now }).eq("id", row.id);
    await supabaseAdmin
      .from("profiles")
      .update({ phone_verified_at: now, account_status: "verified" })
      .eq("id", context.userId);

    return { ok: true as const };
  });
