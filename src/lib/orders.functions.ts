import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, packages(name, slug, sms_volume)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const initiatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    package_slug: z.string().min(1),
    provider: z.enum(["cinetpay", "fedapay"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pkg, error: pkgErr } = await context.supabase
      .from("packages").select("*").eq("slug", data.package_slug).eq("active", true).maybeSingle();
    if (pkgErr || !pkg) throw new Error("Package introuvable");

    const { data: order, error } = await context.supabase.from("orders").insert({
      user_id: context.userId,
      package_id: pkg.id,
      amount_fcfa: pkg.price_fcfa,
      sms_volume: pkg.sms_volume,
      status: "pending",
      provider: data.provider,
    }).select().single();
    if (error) throw error;

    const { createPaymentSession } = await import("./payments.server");
    const session = await createPaymentSession({
      orderId: order.id,
      amountFcfa: pkg.price_fcfa,
      provider: data.provider,
      description: `Package ${pkg.name} — ${pkg.sms_volume} SMS`,
    });
    return { order, session };
  });
