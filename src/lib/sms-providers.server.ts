/**
 * Couche fournisseur SMS — server only.
 *
 * Fournisseur principal : NTouch Solution.
 * Variables d'environnement à fournir (secrets) :
 *   NTOUCH_API_URL        endpoint d'envoi, ex. https://api.ntouchsolution.com/v1/sms/send
 *   NTOUCH_API_KEY        clé API / token
 *   NTOUCH_CLIENT_ID      identifiant de compte (optionnel selon le contrat)
 *   NTOUCH_LOGIN          login API (si le fournisseur utilise login/mot de passe)
 *   NTOUCH_PASSWORD       mot de passe API (idem)
 *   NTOUCH_AUTH_MODE      "bearer" (défaut) | "apikey_header" | "body"
 *   NTOUCH_SENDER         nom d'expéditeur par défaut
 *   NTOUCH_WEBHOOK_SECRET secret partagé pour le webhook de statut de livraison
 *   NTOUCH_DLR_URL        URL de callback transmise au fournisseur (optionnel)
 *
 * Fournisseur de secours : NM Groupe (NMGROUPE_API_URL / NMGROUPE_API_KEY).
 */

export type ProviderName = "ntouch" | "nmgroupe";

export type SendResult = {
  status: "sent" | "queued" | "failed";
  provider: ProviderName | "none";
  provider_message_id?: string;
  error?: string;
};

export type SendParams = { to: string; from: string; message: string };

export function activeProvider(): ProviderName | "none" {
  if (process.env["NTOUCH_API_URL"] && (process.env["NTOUCH_API_KEY"] || process.env["NTOUCH_LOGIN"])) {
    return "ntouch";
  }
  if (process.env["NMGROUPE_API_URL"] && process.env["NMGROUPE_API_KEY"]) return "nmgroupe";
  return "none";
}

function ntouchHeaders(): Record<string, string> {
  const mode = process.env["NTOUCH_AUTH_MODE"] ?? "bearer";
  const key = process.env["NTOUCH_API_KEY"] ?? "";
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (mode === "bearer" && key) headers["Authorization"] = `Bearer ${key}`;
  if (mode === "apikey_header" && key) headers["X-API-Key"] = key;
  const clientId = process.env["NTOUCH_CLIENT_ID"];
  if (clientId) headers["X-Client-Id"] = clientId;
  return headers;
}

async function sendViaNTouch(params: SendParams): Promise<SendResult> {
  const url = process.env["NTOUCH_API_URL"];
  if (!url) return { status: "failed", provider: "ntouch", error: "NTOUCH_API_URL manquant" };

  const mode = process.env["NTOUCH_AUTH_MODE"] ?? "bearer";
  const payload: Record<string, unknown> = {
    to: params.to,
    msisdn: params.to,
    from: params.from || process.env["NTOUCH_SENDER"] || "SMSPRO",
    sender: params.from || process.env["NTOUCH_SENDER"] || "SMSPRO",
    message: params.message,
    text: params.message,
  };
  if (mode === "body") {
    payload["api_key"] = process.env["NTOUCH_API_KEY"] ?? "";
    payload["login"] = process.env["NTOUCH_LOGIN"] ?? "";
    payload["password"] = process.env["NTOUCH_PASSWORD"] ?? "";
  }
  const dlr = process.env["NTOUCH_DLR_URL"];
  if (dlr) payload["callback_url"] = dlr;

  try {
    const res = await fetch(url, { method: "POST", headers: ntouchHeaders(), body: JSON.stringify(payload) });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        status: "failed",
        provider: "ntouch",
        error: String(body["message"] ?? body["error"] ?? `HTTP ${res.status}`),
      };
    }
    return {
      status: "queued",
      provider: "ntouch",
      provider_message_id: String(body["id"] ?? body["message_id"] ?? body["messageId"] ?? ""),
    };
  } catch (err) {
    return { status: "failed", provider: "ntouch", error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendViaNMGroupe(params: SendParams): Promise<SendResult> {
  const url = process.env["NMGROUPE_API_URL"];
  const key = process.env["NMGROUPE_API_KEY"];
  if (!url || !key) return { status: "failed", provider: "nmgroupe", error: "NM Groupe non configuré" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(process.env["NMGROUPE_ACCOUNT_ID"] ? { "X-Account-Id": process.env["NMGROUPE_ACCOUNT_ID"]! } : {}),
      },
      body: JSON.stringify({ to: params.to, from: params.from, message: params.message }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { status: "failed", provider: "nmgroupe", error: String(body["message"] ?? `HTTP ${res.status}`) };
    }
    return {
      status: "queued",
      provider: "nmgroupe",
      provider_message_id: String(body["id"] ?? body["message_id"] ?? ""),
    };
  } catch (err) {
    return { status: "failed", provider: "nmgroupe", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendSms(params: SendParams): Promise<SendResult> {
  const provider = activeProvider();
  if (provider === "ntouch") return sendViaNTouch(params);
  if (provider === "nmgroupe") return sendViaNMGroupe(params);
  return { status: "failed", provider: "none", error: "Aucun fournisseur SMS configuré (clés API manquantes)" };
}
