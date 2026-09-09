import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/fedapay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 503 });
        }
        const sig = request.headers.get("x-fedapay-signature") ?? "";
        const expected = createHmac("sha256", secret).update(bodyText).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }
        let payload: any;
        try { payload = JSON.parse(bodyText); } catch { return new Response("Invalid JSON", { status: 400 }); }

        const entity = payload?.entity ?? payload;
        const orderId = entity?.metadata?.order_id;
        const status = entity?.status;
        if (!orderId) return new Response("Missing metadata.order_id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin.from("orders").select("id, status").eq("id", orderId).maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });

        if (status === "approved" || status === "transferred") {
          // Idempotent : crédite une seule fois, même si le webhook est rejoué.
          const { data: credited, error } = await supabaseAdmin.rpc("settle_paid_order", {
            _order_id: order.id,
            _provider_transaction_id: String(entity.id ?? ""),
            _provider_payload: payload,
          });
          if (error) return new Response("Settlement failed", { status: 500 });
          return Response.json({ ok: true, credited: credited ?? 0 });
        }

        if ((status === "declined" || status === "canceled" || status === "failed") && order.status !== "paid") {
          await supabaseAdmin.from("orders").update({
            status: "failed",
            provider_payload: payload,
          }).eq("id", order.id).neq("status", "paid");
        }


        return Response.json({ ok: true });
      },
    },
  },
});
