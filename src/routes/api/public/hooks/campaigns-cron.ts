/**
 * Cron endpoint — processes scheduled + recurring campaigns.
 * Call every minute from pg_cron via net.http_post.
 * Auth: shared secret in `x-cron-secret` header (must match CAMPAIGNS_CRON_SECRET).
 */
import { createFileRoute } from "@tanstack/react-router";

function nextRunFor(recurrence: string | null, from: Date): Date | null {
  if (!recurrence) return null;
  const d = new Date(from);
  if (recurrence === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (recurrence === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (recurrence === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else return null;
  return d;
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.CAMPAIGNS_CRON_SECRET;
  if (!expected) return false;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /, "") ??
    "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }


  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendCampaignViaNMGroupe } = await import("@/lib/nmgroupe.server");

  const now = new Date();
  const { data: due, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .in("status", ["scheduled", "recurring"])
    .lte("next_run_at", now.toISOString())
    .limit(20);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const processed: any[] = [];
  for (const camp of due ?? []) {
    try {
      const res = await sendCampaignViaNMGroupe(camp.id, camp.user_id);
      await supabaseAdmin.from("campaign_executions").insert({
        campaign_id: camp.id,
        user_id: camp.user_id,
        sent_count: res.sent,
        failed_count: res.failed,
        status: res.failed === res.total ? "failed" : "success",
      });

      if (camp.recurrence) {
        const next = nextRunFor(camp.recurrence, now);
        const endReached = camp.recurrence_end && next && new Date(camp.recurrence_end) < next;
        await supabaseAdmin.from("campaigns").update({
          status: endReached ? "sent" : "recurring",
          next_run_at: endReached ? null : next?.toISOString() ?? null,
          last_run_at: now.toISOString(),
        }).eq("id", camp.id);
      } else {
        await supabaseAdmin.from("campaigns").update({
          status: "sent",
          last_run_at: now.toISOString(),
          next_run_at: null,
        }).eq("id", camp.id);
      }
      processed.push({ id: camp.id, ...res });
    } catch (e: any) {
      await supabaseAdmin.from("campaign_executions").insert({
        campaign_id: camp.id, user_id: camp.user_id,
        status: "failed", error: e?.message ?? "unknown",
      });
    }
  }
  return Response.json({ ok: true, processed: processed.length });
}

export const Route = createFileRoute("/api/public/hooks/campaigns-cron")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
