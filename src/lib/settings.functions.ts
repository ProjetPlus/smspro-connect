import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMockMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { readMockSettings } = await import("./settings.server");
    return readMockSettings();
  });

export const setMockMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sms: z.boolean(), payments: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r: { role: string }) => r.role === "admin")) {
      throw new Error("Accès refusé : administrateur requis");
    }
    const { writeMockSettings } = await import("./settings.server");
    return writeMockSettings(data);
  });
