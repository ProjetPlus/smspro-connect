import { createFileRoute } from "@tanstack/react-router";
import { flushPendingEmails } from "@/lib/emails.server";

/**
 * Relance l'envoi des e-mails restés en attente.
 * Appelable par un planificateur externe ; n'expose aucune donnée.
 */
export const Route = createFileRoute("/api/public/email-flush")({
  server: {
    handlers: {
      GET: async () => {
        const result = await flushPendingEmails();
        return Response.json({ ok: true, ...result });
      },
      POST: async () => {
        const result = await flushPendingEmails();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
