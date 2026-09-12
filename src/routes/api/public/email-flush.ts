import { createFileRoute } from "@tanstack/react-router";

/**
 * Relance l'envoi des e-mails restés en attente.
 * Réservé au planificateur : secret partagé dans l'en-tête `x-cron-secret`
 * (doit correspondre à EMAIL_FLUSH_SECRET, CAMPAIGNS_CRON_SECRET ou LOVABLE_CRON_SECRET).
 */
function matches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  const secrets = [
    process.env["EMAIL_FLUSH_SECRET"],
    process.env["CAMPAIGNS_CRON_SECRET"],
    process.env["LOVABLE_CRON_SECRET"],
  ].filter((value): value is string => Boolean(value));
  if (!secrets.length) return false;

  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /, "") ??
    "";
  if (!provided) return false;

  return secrets.some((expected) => matches(provided, expected));
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { flushPendingEmails } = await import("@/lib/emails.server");
  const result = await flushPendingEmails();
  return Response.json({ ok: true, ...result });
}

export const Route = createFileRoute("/api/public/email-flush")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
