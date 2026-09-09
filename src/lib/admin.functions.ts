import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdminRole } from "./server-function-helpers";

export const listAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: usersCount }, { count: campaignsCount }, paid, recentOrders, recentCampaigns] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("campaigns").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("amount_fcfa").eq("status", "paid"),
      supabaseAdmin.from("orders").select("*, profiles!inner(email), packages(name)").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("campaigns").select("*, profiles!inner(email)").order("created_at", { ascending: false }).limit(10),
    ]);

    const revenue = (paid.data ?? []).reduce((s: number, o: any) => s + (o.amount_fcfa ?? 0), 0);
    return {
      usersCount: usersCount ?? 0,
      campaignsCount: campaignsCount ?? 0,
      paidOrders: paid.data?.length ?? 0,
      revenue,
      recentOrders: recentOrders.data ?? [],
      recentCampaigns: recentCampaigns.data ?? [],
    };
  });

// ============ USERS ============
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });
    return profiles ?? [];
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; sms_credits?: number; full_name?: string; company?: string; phone?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: "admin" | "client"; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    if (data.id === context.userId) throw new Error("Impossible de supprimer votre propre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; full_name?: string; role?: "admin" | "client"; sms_credits?: number }) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      full_name: z.string().optional(),
      role: z.enum(["admin", "client"]).optional(),
      sms_credits: z.number().int().nonnegative().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { assertPasswordAllowed } = await import("./password.server");
    const policyError = await assertPasswordAllowed(data.password);
    if (policyError) throw new Error(policyError);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name ?? "" },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Erreur");
    if (data.sms_credits && data.sms_credits > 0) {
      await supabaseAdmin.from("profiles").update({ sms_credits: data.sms_credits }).eq("id", created.user.id);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });
    }
    return { ok: true, id: created.user.id };
  });

// ============ PACKAGES ============
export const listPackagesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("packages").select("*").order("price_fcfa");
    return data ?? [];
  });

export const upsertPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; slug: string; name: string; price_fcfa: number; sms_volume: number;
    features: string[]; is_active?: boolean; featured?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: any = {
      slug: data.slug, name: data.name, price_fcfa: data.price_fcfa,
      sms_volume: data.sms_volume, features: data.features,
      active: data.is_active ?? true, featured: data.featured ?? false,
    };
    if (data.id) row.id = data.id;
    const { error } = await supabaseAdmin.from("packages").upsert(row, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ORDERS ============
export const listOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("orders").select("*, profiles!inner(email, full_name), packages(name)").order("created_at", { ascending: false });
    return data ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "paid" | "failed" | "cancelled" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.status === "paid") {
      // Idempotent : marque payé et crédite une seule fois.
      const { data: credited, error } = await supabaseAdmin.rpc("settle_paid_order", {
        _order_id: data.id,
      });

      if (error) throw new Error(error.message);
      return { ok: true, credited: credited ?? 0 };
    }
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, credited: 0 };
  });


// ============ CAMPAIGNS ============
export const listCampaignsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("campaigns").select("*, profiles!inner(email)").order("created_at", { ascending: false });
    return data ?? [];
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ CONTACTS ============
export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("contact_submissions").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const updateContactStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
