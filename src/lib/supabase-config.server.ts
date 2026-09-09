/**
 * Résolution robuste de la configuration Supabase côté serveur.
 * Les valeurs publiques (URL + clé publiable) ont un repli codé en dur afin que
 * l'inscription et la connexion fonctionnent même si l'hébergeur (Vercel, etc.)
 * n'a pas les variables d'environnement configurées.
 * La clé service_role n'a AUCUN repli : elle reste strictement une variable
 * d'environnement serveur et son absence ne doit jamais casser un parcours public.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_URL = "https://hiekafgczhlzrsfxxtxw.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZWthZmdjemhsenJzZnh4dHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTM5NjcsImV4cCI6MjEwMjUyOTk2N30.RrvFvDIUMNc2l-g4jVEFWAMNOfRp4R8mfNacP5bRS9g";

export function resolveSupabaseUrl(): string {
  return process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || FALLBACK_URL;
}

export function resolveSupabasePublishableKey(): string {
  return (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    FALLBACK_PUBLISHABLE_KEY
  );
}

export function hasServiceRoleKey(): boolean {
  return !!process.env["SUPABASE_SERVICE_ROLE_KEY"];
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** Client anonyme serveur (RLS appliquée en tant qu'anon). */
export function createAnonServerClient() {
  const key = resolveSupabasePublishableKey();
  return createClient<Database>(resolveSupabaseUrl(), key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch(key) },
  });
}

/** Client service_role, ou null si la clé n'est pas disponible sur cet hôte. */
export async function tryGetSupabaseAdmin() {
  if (!hasServiceRoleKey()) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}
