/**
 * Webhook NTouch Solution — accusés de réception (DLR).
 * URL publique : /api/public/webhooks/ntouch
 * Auth : secret partagé dans l'en-tête `x-ntouch-secret` (NTOUCH_WEBHOOK_SECRET).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  message_id: z.string().min(1).max(200).optional(),
  id: z.string().min(1).max(200).optional(),
  status: z.string().min(1).max(60),
  to: z.string().max(30).optional(),
  error: z.string().max(500).optional(),
});

function authorized(request: Request): boolean {
  const expected = process.env["NTOUCH_WEBHOOK_SECRET"];
  if (!expected) return false;
  const provided =
    request.headers.get("x-ntouch-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
    "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function mapStatus(raw: string): "delivered" | "failed" | "sent" {
  const value = raw.toLowerCase();
  if (["delivered", "delivrd", "success", "ok", "2"].includes(value)) return "delivered";
  if (["failed", "undeliv", "rejected", "expired", "error"].includes(value)) return "failed";
  return "sent";
}

export const Route = createFileRoute("/api/public/webhooks/ntouch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const providerId = parsed.data.message_id ?? parsed.data.id;
        if (!providerId) return new Response("Missing message id", { status: 400 });

        const status = mapStatus(parsed.data.status);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        await supabaseAdmin
          .from("sms_messages")
          .update({
            status,
            error: parsed.data.error ?? null,
            delivered_at: status === "delivered" ? new Date().toISOString() : null,
          })
          .eq("provider_message_id", providerId);

        await supabaseAdmin.from("webhook_events").insert({
          provider: "ntouch",
          event_type: "dlr",
          external_id: providerId,
          status: "processed",
          payload_summary: { status: parsed.data.status, to: parsed.data.to ?? null },
          processed_at: new Date().toISOString(),
        });

        return Response.json({ ok: true });
      },
    },
  },
});
