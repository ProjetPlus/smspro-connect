/**
 * Envoi d'e-mails transactionnels via Brevo (server only).
 *
 * Secret requis : BREVO_API_KEY
 * Optionnels    : EMAIL_FROM (adresse expéditeur), EMAIL_FROM_NAME,
 *                 ADMIN_NOTIFICATION_EMAIL, APP_PUBLIC_URL
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type EmailResult = { sent: boolean; reason?: string };

export function adminNotificationEmail(): string {
  return process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "admin@smspromobile.com";
}

export function appUrl(): string {
  return (process.env["APP_PUBLIC_URL"] ?? "https://smsmobilepro.lovable.app").replace(/\/+$/, "");
}

function sender() {
  return {
    name: process.env["EMAIL_FROM_NAME"] ?? "SMS Pro Mobile",
    email: process.env["EMAIL_FROM"] ?? "noreply@smspromobile.com",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gabarit HTML commun, sobre et lisible sur tous les clients mail. */
export function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f6f5f3;font-family:Helvetica,Arial,sans-serif;color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:6px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:20px 24px;border-bottom:1px solid #e7e5e4;font-weight:700;letter-spacing:.08em;font-size:12px;text-transform:uppercase;color:#b45309">SMS Pro Mobile</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h1>
        <div style="font-size:14px;line-height:1.6;color:#44403c">${bodyHtml}</div>
        ${
          cta
            ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:700;font-size:14px">${escapeHtml(cta.label)}</a></p>`
            : ""
        }
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e7e5e4;font-size:11px;color:#a8a29e">
        Cet e-mail vous est envoyé automatiquement par la plateforme SMS Pro Mobile.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) return { sent: false, reason: "BREVO_API_KEY non configurée" };

  const recipients = (Array.isArray(params.to) ? params.to : [params.to])
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
  if (!recipients.length) return { sent: false, reason: "Aucun destinataire" };

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: sender(),
        to: recipients,
        subject: params.subject,
        htmlContent: params.html,
        ...(params.text ? { textContent: params.text } : {}),
        ...(params.replyTo ? { replyTo: { email: params.replyTo } } : {}),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, reason: `Brevo ${response.status} ${detail.slice(0, 200)}`.trim() };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : "Erreur d'envoi" };
  }
}

/* ------------------------------------------------------------------ */
/* Modèles transactionnels                                             */
/* ------------------------------------------------------------------ */

export function sendWelcomeEmail(to: string, firstName: string) {
  return sendEmail({
    to,
    subject: "Bienvenue sur SMS Pro Mobile",
    html: layout(
      `Bienvenue ${escapeHtml(firstName)} !`,
      `<p>Votre compte SMS Pro Mobile est créé. Prochaine étape : vérifier votre compte (KYC) pour activer votre nom d'expéditeur, puis choisir votre pack SMS.</p>`,
      { label: "Ouvrir mon tableau de bord", href: `${appUrl()}/dashboard` },
    ),
  });
}

export function sendOtpEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: `Votre code de vérification : ${code}`,
    html: layout(
      "Code de vérification",
      `<p>Voici votre code de vérification :</p>
       <p style="font-size:30px;font-weight:800;letter-spacing:.3em;margin:16px 0">${escapeHtml(code)}</p>
       <p>Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
    ),
    text: `Votre code de vérification SMS Pro Mobile : ${code} (valable 10 minutes).`,
  });
}

export function sendKycReceivedEmail(to: string) {
  return sendEmail({
    to,
    subject: "Dossier de vérification reçu — achetez votre pack",
    html: layout(
      "Votre dossier a bien été reçu",
      `<p>Nos équipes vont l'examiner. <strong>Pour que votre demande soit validée, vous devez acheter un pack SMS.</strong></p>
       <p>Une fois le paiement confirmé, votre compte est validé et votre nom d'expéditeur activé.</p>`,
      { label: "Choisir mon pack", href: `${appUrl()}/tarifs` },
    ),
  });
}

export function sendPaymentConfirmedEmail(to: string, packName: string, sms: number) {
  return sendEmail({
    to,
    subject: "Paiement confirmé",
    html: layout(
      "Paiement confirmé",
      `<p>Nous avons bien reçu votre paiement pour le pack <strong>${escapeHtml(packName)}</strong> (${sms.toLocaleString("fr-FR")} SMS).</p>
       <p>Votre dossier passe en validation finale.</p>`,
      { label: "Voir mon compte", href: `${appUrl()}/dashboard` },
    ),
  });
}

export function sendAccountApprovedEmail(to: string) {
  return sendEmail({
    to,
    subject: "Votre compte est validé",
    html: layout(
      "Compte validé",
      `<p>Votre dossier est approuvé : votre nom d'expéditeur est actif et vous pouvez lancer vos campagnes.</p>`,
      { label: "Lancer une campagne", href: `${appUrl()}/dashboard/campaigns` },
    ),
  });
}

export function sendAccountRejectedEmail(to: string, notes?: string | null) {
  return sendEmail({
    to,
    subject: "Votre dossier nécessite une correction",
    html: layout(
      "Dossier à corriger",
      `<p>Votre dossier de vérification n'a pas pu être validé.</p>
       ${notes ? `<p><strong>Motif :</strong> ${escapeHtml(notes)}</p>` : ""}
       <p>Vous pouvez corriger et soumettre à nouveau depuis votre espace.</p>`,
      { label: "Reprendre ma vérification", href: `${appUrl()}/verification` },
    ),
  });
}

export function sendAdminEmail(subject: string, body: string, replyTo?: string) {
  return sendEmail({
    to: adminNotificationEmail(),
    subject,
    html: layout(subject, `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(body)}</pre>`, {
      label: "Ouvrir l'administration",
      href: `${appUrl()}/admin/signups`,
    }),
    text: body,
    ...(replyTo ? { replyTo } : {}),
  });
}
