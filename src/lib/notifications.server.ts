import { adminNotificationEmail, sendAdminEmail as sendAdminBrevoEmail, type EmailResult } from "./emails.server";

export type { EmailResult };

/** Envoie un e-mail de notification à l'administrateur (via Brevo). */
export async function sendAdminEmail(
  subject: string,
  body: string,
  replyTo?: string,
): Promise<EmailResult> {
  return sendAdminBrevoEmail(subject, body, replyTo);
}

export { adminNotificationEmail };

/** Compat : point d'entrée utilisé par le tunnel de vérification. */
export async function sendAdminSignupEmail(body: string, clientEmail: string): Promise<EmailResult> {
  return sendAdminEmail("Nouveau dossier de vérification à traiter", body, clientEmail);
}
