import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdminRole } from "./server-function-helpers";

export const listHeroSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { data, error } = await context.supabase
      .from("hero_slides")
      .select("*")
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const upsertHeroSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    media_url: z.string().url(),
    eyebrow: z.string().max(80).default(""),
    title: z.string().min(2).max(200),
    subtitle: z.string().max(400).optional().nullable(),
    href: z.string().max(300).optional().nullable(),
    cta: z.string().max(60).optional().nullable(),
    kind: z.enum(["sms", "email", "uemoa", "news", "money", "other"]).default("other"),
    position: z.number().int().min(0).max(9999).default(0),
    duration_ms: z.number().int().min(1500).max(30000).default(5000),
    pause_on_hover: z.boolean().default(true),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("hero_slides")
        .update(data)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("hero_slides")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteHeroSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { error } = await context.supabase.from("hero_slides").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderHeroSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { order: { id: string; position: number }[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    for (const { id, position } of data.order) {
      await context.supabase.from("hero_slides").update({ position }).eq("id", id);
    }
    return { ok: true };
  });
