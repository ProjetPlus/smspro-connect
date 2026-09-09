import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* --------- LIST --------- */

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: camp, error } = await context.supabase
      .from("campaigns").select("*").eq("id", data.id).single();
    if (error) throw error;
    return camp;
  });

export const listExecutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { campaign_id?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("campaign_executions")
      .select("*, campaigns(name)")
      .order("run_at", { ascending: false })
      .limit(200);
    if (data.campaign_id) q = q.eq("campaign_id", data.campaign_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const listCampaignMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ campaign_id: z.string().uuid(), limit: z.number().int().min(1).max(500).default(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: messages, error } = await context.supabase
      .from("sms_messages")
      .select("id, phone, status, error, sent_at, delivered_at, created_at")
      .eq("campaign_id", data.campaign_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return messages ?? [];
  });

/* --------- REPORT (dashboard de suivi) --------- */

export const getCampaignsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: campaigns, error: e1 }, { data: execs, error: e2 }, { data: msgs, error: e3 }] = await Promise.all([
      context.supabase.from("campaigns").select("id, name, status, sent_count, delivered_count, failed_count, created_at, next_run_at, last_run_at").order("created_at", { ascending: false }),
      context.supabase.from("campaign_executions").select("*, campaigns(name)").order("run_at", { ascending: false }).limit(200),
      context.supabase.from("sms_messages").select("status, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1000),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;

    const totals = (msgs ?? []).reduce(
      (acc, m) => {
        acc.total += 1;
        if (m.status === "delivered") acc.delivered += 1;
        else if (m.status === "failed") acc.failed += 1;
        else if (m.status === "sent" || m.status === "queued") acc.sent += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 },
    );

    const byDay = new Map<string, number>();
    for (const m of msgs ?? []) {
      const day = String(m.created_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    return {
      campaigns: campaigns ?? [],
      executions: execs ?? [],
      totals,
      byDay: Array.from(byDay.entries()).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    };
  });

/* --------- TEST SEND --------- */

export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    recipients: z.array(z.string().min(6).max(20)).min(1).max(3),
    sender_id: z.string().min(1).max(11),
    message: z.string().min(1).max(1000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: remaining, error: reserveError } = await context.supabase.rpc("reserve_sms_credits", {
      _user_id: context.userId,
      _amount: data.recipients.length,
    });
    if (reserveError) throw new Error(reserveError.message);
    if (remaining === null || remaining === undefined) throw new Error("Crédits SMS insuffisants pour l'envoi test.");

    const { sendSms } = await import("./sms-providers.server");
    const results: { phone: string; status: string; error?: string }[] = [];
    let failed = 0;
    for (const phone of data.recipients) {
      const res = await sendSms({ to: phone, from: data.sender_id, message: data.message });
      if (res.status === "failed") failed += 1;
      results.push({ phone, status: res.status, ...(res.error ? { error: res.error } : {}) });
      await context.supabase.from("sms_messages").insert({
        user_id: context.userId,
        phone,
        message: data.message,
        sender_id: data.sender_id,
        status: res.status === "failed" ? "failed" : "sent",
        error: res.error ?? null,
        sent_at: res.status === "failed" ? null : new Date().toISOString(),
      });
    }
    if (failed > 0) {
      await context.supabase.rpc("refund_sms_credits", { _user_id: context.userId, _amount: failed });
    }
    return { results, failed, total: data.recipients.length };
  });

/* --------- CREATE / UPDATE --------- */

export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    sender_id: z.string().min(1).max(11),
    message: z.string().min(1).max(1000),
    recipients: z.array(z.string().min(6).max(20)).min(1).max(100000),
    scheduled_at: z.string().optional().nullable(),
    recurrence: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
    recurrence_end: z.string().optional().nullable(),
    save_as_draft: z.boolean().optional(),
  }).parse(d))

  .handler(async ({ data, context }) => {
    const status = data.save_as_draft ? "draft" : data.recurrence ? "recurring" : data.scheduled_at ? "scheduled" : "draft";
    const next_run_at = data.scheduled_at ?? null;

    const payload = {
      user_id: context.userId,
      name: data.name,
      sender_id: data.sender_id,
      message: data.message,
      recipients: data.recipients,
      status,
      scheduled_at: data.scheduled_at ?? null,
      recurrence: data.recurrence ?? null,
      recurrence_end: data.recurrence_end ?? null,
      next_run_at,
    };

    if (data.id) {
      const { data: camp, error } = await context.supabase
        .from("campaigns")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw error;
      return camp;
    }
    const { data: camp, error } = await context.supabase
      .from("campaigns")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return camp;
  });

// Legacy alias for callers still using createCampaign
export const createCampaign = upsertCampaign;

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("campaigns").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const duplicateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: src, error } = await context.supabase
      .from("campaigns").select("*").eq("id", data.id).single();
    if (error || !src) throw new Error("Campagne introuvable");
    const { data: copy, error: e2 } = await context.supabase
      .from("campaigns")
      .insert({
        user_id: context.userId,
        name: `${src.name} (copie)`,
        sender_id: src.sender_id,
        message: src.message,
        recipients: src.recipients,
        status: "draft",
      })
      .select().single();
    if (e2) throw e2;
    return copy;
  });

/* --------- SEND (immediate) --------- */

export const sendCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: camp, error } = await context.supabase
      .from("campaigns").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !camp) throw new Error("Campagne introuvable");
    if (camp.status === "sending") throw new Error("Envoi déjà en cours");

    // Aucun envoi tant que le dossier de vérification n'est pas approuvé par l'administration.
    const { data: application } = await context.supabase
      .from("signup_applications")
      .select("status, paid_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (application?.['status'] !== "approved") {
      throw new Error(
        !application
          ? "Complétez votre dossier de vérification avant d'envoyer des SMS."
          : application['paid_at']
            ? "Votre compte est en cours de validation par l'administration."
            : "Achetez un pack pour faire valider votre demande avant d'envoyer des SMS.",
      );
    }



    const { data: profile } = await context.supabase
      .from("profiles").select("sms_credits").eq("id", context.userId).maybeSingle();
    const credits = profile?.sms_credits ?? 0;
    const list = (camp.recipients as string[]) ?? [];
    if (credits < list.length) throw new Error(`Crédits insuffisants (${credits}/${list.length}).`);

    const { sendCampaignViaNMGroupe } = await import("./nmgroupe.server");
    const result = await sendCampaignViaNMGroupe(camp.id, context.userId);
    return result;
  });
