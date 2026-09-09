import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const trackEvent = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({
    event_name: z.string().trim().min(1).max(100),
    properties: z.record(z.string(), z.unknown()).optional(),
    session_id: z.string().max(100).optional().nullable(),
    page_url: z.string().max(500).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: data.event_name,
      properties: (data.properties ?? {}) as never,
      session_id: data.session_id ?? null,
      page_url: data.page_url ?? null,
      referrer: data.referrer ?? null,
    });
    if (error) console.error("[analytics] insert failed:", error);
    return { ok: true as const };
  });
