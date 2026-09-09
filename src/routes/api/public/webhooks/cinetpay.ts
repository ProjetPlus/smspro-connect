import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function secretMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/cinetpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Authentification de l'appelant : secret partagé transmis dans la notify_url
        // (query string) ou dans un en-tête. Sans lui, n'importe qui pourrait rejouer
        // la notification d'une commande connue.
        const webhookSecret = process.env.CINETPAY_WEBHOOK_SECRET;
        if (!webhookSecret) return new Response("Webhook secret not configured", { status: 503 });
        const url = new URL(request.url);
        const provided = url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "";
        if (!provided || !secretMatches(provided, webhookSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        let payload: Record<string, any> = {};
        if (contentType.includes("application/json")) {
          payload = await request.json().catch(() => ({}));
        } else {
          const form = await request.formData().catch(() => null);
          if (form) form.forEach((v, k) => (payload[k] = String(v)));
        }

        const transactionId = payload.cpm_trans_id ?? payload.transaction_id;
        if (!transactionId) return new Response("Missing transaction_id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify with CinetPay API
        const apiKey = process.env.CINETPAY_API_KEY;
        const siteId = process.env.CINETPAY_SITE_ID;
        if (!apiKey || !siteId) return new Response("Not configured", { status: 503 });

        const verifyRes = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
        });
        const verify = (await verifyRes.json().catch(() => ({}))) as any;
        const status = verify?.data?.status;

        const { data: order } = await supabaseAdmin
          .from("orders").select("id, status").eq("id", transactionId).maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });

        if (status === "ACCEPTED") {
          // Idempotent : la fonction ne crédite que si la commande n'était pas déjà payée.
          const { data: credited, error } = await supabaseAdmin.rpc("settle_paid_order", {
            _order_id: order.id,
            _provider_transaction_id: String(transactionId),
            _provider_payload: verify,
          });
          if (error) return new Response("Settlement failed", { status: 500 });
          return Response.json({ ok: true, credited: credited ?? 0 });
        }

        if (status && status !== "PENDING" && order.status !== "paid") {
          await supabaseAdmin.from("orders").update({
            status: "failed",
            provider_payload: verify,
          }).eq("id", order.id).neq("status", "paid");
        }

        return Response.json({ ok: true, credited: 0 });
      },
    },
  },
});

