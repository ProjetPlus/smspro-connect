import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// NM Groupe delivery receipt webhook.
// Expected payload (adapt to actual NM Groupe spec once documented):
//   {
//     "message_id": "provider-id",
//     "status": "delivered" | "failed" | "sent",
//     "error": "optional string",
//     "delivered_at": "2026-07-24T10:00:00Z"
//   }
// Signature (optional but recommended): HMAC-SHA256 of raw body using
// process.env.NMGROUPE_WEBHOOK_SECRET, sent as `x-nmgroupe-signature`.

export const Route = createFileRoute("/api/public/webhooks/nmgroupe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        const secret = process.env.NMGROUPE_WEBHOOK_SECRET;

        if (!secret) {
          return new Response("Webhook secret not configured", { status: 503 });
        }
        const sig = request.headers.get("x-nmgroupe-signature") ?? "";
        const expected = createHmac("sha256", secret).update(bodyText).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(bodyText);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const events = Array.isArray(payload) ? payload : [payload];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const ev of events) {
          const providerId = ev.message_id ?? ev.id;
          const status = ev.status;
          if (!providerId || !status) continue;

          const update: { status: string; delivered_at?: string; error?: string } = { status };
          if (status === "delivered") update.delivered_at = ev.delivered_at ?? new Date().toISOString();
          if (ev.error) update.error = String(ev.error);

          const { data: msg } = await supabaseAdmin
            .from("sms_messages")
            .update(update)
            .eq("provider_message_id", providerId)
            .select("campaign_id, status")
            .maybeSingle();

          // Recompute campaign delivered counts if delivered
          if (msg?.campaign_id && status === "delivered") {
            const { count } = await supabaseAdmin
              .from("sms_messages").select("id", { count: "exact", head: true })
              .eq("campaign_id", msg.campaign_id).eq("status", "delivered");
            await supabaseAdmin.from("campaigns")
              .update({ delivered_count: count ?? 0 })
              .eq("id", msg.campaign_id);
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
