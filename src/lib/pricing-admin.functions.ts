import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdminRole } from "./server-function-helpers";

export const listPricingTiersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("pricing_tiers").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const tierSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  min_sms: z.number().int().nonnegative(),
  max_sms: z.number().int().positive().nullable(),
  unit_price_fcfa: z.number().int().positive(),
  sort_order: z.number().int().nonnegative(),
  active: z.boolean(),
});

export const upsertPricingTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tierSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    if (data.max_sms !== null && data.max_sms < data.min_sms) {
      throw new Error("Le maximum doit être supérieur ou égal au minimum");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = data.id
      ? await supabaseAdmin.from("pricing_tiers").update({ ...data, id: undefined }).eq("id", data.id)
      : await supabaseAdmin.from("pricing_tiers").insert({ ...data, id: undefined });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePricingTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pricing_tiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
