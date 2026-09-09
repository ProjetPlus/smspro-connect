import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GENERIC_LOGIN_ERROR = "Identifiant ou mot de passe incorrect.";

async function resolveEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim().toLowerCase();
  if (value.includes("@")) return value;

  // La résolution username -> email nécessite un accès privilégié ; si la clé
  // service_role n'est pas disponible, seule la connexion par email est possible.
  const { tryGetSupabaseAdmin } = await import("./supabase-config.server");
  const admin = await tryGetSupabaseAdmin();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .ilike("username", value)
    .maybeSingle();

  return (profile as { email?: string } | null)?.email ?? null;
}


/**
 * Sign in with an email OR username. Resolution happens entirely server-side so
 * anonymous callers can never map a username to an account's email address.
 * Failures always return the same generic message (no account enumeration).
 */
export const loginWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        identifier: z.string().trim().min(1).max(160),
        password: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const email = await resolveEmail(data.identifier);
    if (!email) return { ok: false as const, error: GENERIC_LOGIN_ERROR };

    const { createClient } = await import("@supabase/supabase-js");
    const { resolveSupabaseUrl, resolveSupabasePublishableKey } = await import("./supabase-config.server");
    const url = resolveSupabaseUrl();
    const key = resolveSupabasePublishableKey();


    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: result, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !result.session) return { ok: false as const, error: GENERIC_LOGIN_ERROR };

    return {
      ok: true as const,
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    };
  });

const RESET_PATH = "/reset-password";

/**
 * Hôtes de première partie autorisés comme destination d'un email de récupération.
 * Liste stricte : aucun suffixe d'hébergement mutualisé (*.vercel.app, etc.),
 * qu'un tiers pourrait enregistrer pour capter le jeton de récupération.
 */
const PROJECT_ID = "59b1ca94-6c4d-4eea-9803-50c3bc03f149";
const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "smsmobilepro.com",
  "www.smsmobilepro.com",
  `id-preview--${PROJECT_ID}.lovable.app`,
  `preview--${PROJECT_ID}.lovable.app`,
  `project--${PROJECT_ID}.lovable.app`,
  `project--${PROJECT_ID}-dev.lovable.app`,
  `${PROJECT_ID}.lovableproject.com`,
]);

function isFirstPartyHost(hostname: string) {
  const extra = (process.env.APP_PUBLIC_URL ?? "").trim();
  if (extra) {
    try {
      if (new URL(extra).hostname.toLowerCase() === hostname) return true;
    } catch {
      /* ignore */
    }
  }
  return ALLOWED_HOSTS.has(hostname);
}

/**
 * Normalise la destination du lien de récupération : seuls les domaines de
 * première partie sont acceptés et le chemin est forcé sur /reset-password.
 * Toute autre valeur est remplacée par la destination sûre par défaut.
 */
function safeResetRedirect(value: string): string | null {
  try {
    const url = new URL(value);
    const isSecure = url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!isSecure) return null;
    if (!isFirstPartyHost(url.hostname.toLowerCase())) return null;
    return `${url.origin}${RESET_PATH}`;
  } catch {
    return null;
  }
}

/**
 * Sends a password-recovery email for an email or username. Always returns the
 * same response so callers cannot learn whether an account exists.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        identifier: z.string().trim().min(1).max(160),
        redirectTo: z.string().url().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const redirectTo = safeResetRedirect(data.redirectTo);
      if (!redirectTo) return { ok: true };
      const email = await resolveEmail(data.identifier);
      if (email) {
        const { tryGetSupabaseAdmin, createAnonServerClient } = await import("./supabase-config.server");
        const client = (await tryGetSupabaseAdmin()) ?? createAnonServerClient();
        await client.auth.resetPasswordForEmail(email, { redirectTo });
      }

    } catch (err) {
      console.error("[auth] password reset failed", err);
    }
    return { ok: true };
  });
