const ADMIN_EMAIL = process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "admin@smspromobile.com";

export type EmailResult = { sent: boolean; reason?: string };

/**
 * Envoie un email de notification admin.
 * Tant qu'aucune clé API email n'est configurée, l'envoi est ignoré (statut `skipped`).
 */
export async function sendAdminEmail(
  subject: string,
  body: string,
  replyTo?: string,
): Promise<EmailResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY non configurée" };

  const from = process.env["EMAIL_FROM"] ?? "SMS Pro Mobile <noreply@smspromobile.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ADMIN_EMAIL],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email admin non envoyé (${response.status}) ${detail.slice(0, 200)}`.trim());
  }
  return { sent: true };
}

export function adminNotificationEmail() {
  return ADMIN_EMAIL;
}

/** Compat : ancien point d'entrée utilisé par le tunnel d'inscription. */
export async function sendAdminSignupEmail(body: string, clientEmail: string): Promise<EmailResult> {
  return sendAdminEmail("Nouveau dossier d'inscription à traiter", body, clientEmail);
}
