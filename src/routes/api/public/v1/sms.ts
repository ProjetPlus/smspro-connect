import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

// Public SMS Gateway endpoint for API-key based clients.
// POST /api/public/v1/sms
// Headers: Authorization: Bearer <smspm_...>
// Body: { to: string | string[], message: string, sender_id?: string }

const schema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  message: z.string().min(1).max(1000),
  sender_id: z.string().min(1).max(11).optional(),
});

export const Route = createFileRoute("/api/public/v1/sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);
        const key = auth.slice(7).trim();
        if (!key.startsWith("smspm_")) return json({ error: "Invalid key format" }, 401);

        const hash = createHash("sha256").update(key).digest("hex");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: apiKey } = await supabaseAdmin.from("api_keys")
          .select("id, user_id, revoked_at").eq("key_hash", hash).maybeSingle();
        if (!apiKey || apiKey.revoked_at) return json({ error: "Invalid or revoked key" }, 401);

        let body: any;
        try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return json({ error: parsed.error.message }, 400);

        const recipients = Array.isArray(parsed.data.to) ? parsed.data.to : [parsed.data.to];
        const sender = parsed.data.sender_id ?? "SMSPRO";

        // Check credits
        const { data: prof } = await supabaseAdmin.from("profiles")
          .select("sms_credits").eq("id", apiKey.user_id).single();
        if ((prof?.sms_credits ?? 0) < recipients.length) {
          return json({ error: "Insufficient credits" }, 402);
        }

        // Create ad-hoc campaign
        const { data: camp } = await supabaseAdmin.from("campaigns").insert({
          user_id: apiKey.user_id,
          name: `API — ${new Date().toISOString()}`,
          sender_id: sender,
          message: parsed.data.message,
          recipients,
          status: "sending",
        }).select().single();

        await supabaseAdmin.from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", apiKey.id);

        const { sendCampaignViaNMGroupe } = await import("@/lib/nmgroupe.server");
        const result = await sendCampaignViaNMGroupe(camp!.id, apiKey.user_id);
        return json({ campaign_id: camp!.id, ...result });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
