import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "./server-function-helpers";

export const listAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("audience", "admin")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), read: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { error } = await context.supabase.from("notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Réessaie l'envoi de l'email d'une notification admin et met à jour
 * le statut (sent / failed / skipped), l'erreur, la date d'envoi et le compteur de tentatives.
 */
export const retryNotificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);

    const { data: row, error } = await context.supabase
      .from("notifications")
      .select("id, title, body, email_attempts, link")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Notification introuvable");

    const { sendAdminEmail, adminNotificationEmail } = await import("./notifications.server");

    const attempts = (row.email_attempts ?? 0) + 1;
    const now = new Date().toISOString();
    let status = "failed";
    let errorMessage: string | null = null;
    let sentAt: string | null = null;

    try {
      const result = await sendAdminEmail(
        row.title ?? "Notification SMS Pro Mobile",
        [row.body ?? "", row.link ? `\nDossier : ${row.link}` : ""].join(""),
      );
      if (result.sent) {
        status = "sent";
        sentAt = now;
      } else {
        status = "skipped";
        errorMessage = result.reason ?? null;
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
    }

    const { error: upErr } = await context.supabase
      .from("notifications")
      .update({
        email_status: status,
        email_error: errorMessage,
        email_sent_at: sentAt,
        email_attempts: attempts,
        email_last_attempt_at: now,
        email_to: adminNotificationEmail(),
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    return { status, attempts, error: errorMessage };
  });

