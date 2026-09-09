import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Marks GDPR consent at signup or profile edit.
 */
export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { marketing?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        gdpr_consent_at: new Date().toISOString(),
        marketing_consent: !!data.marketing,
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Fully deletes the current user's account and all linked data.
 * Cascades:
 *   - profiles, campaigns, sms_messages, orders, api_keys, campaign_executions, user_roles
 *     all reference auth.users(id) with ON DELETE CASCADE (or are cleaned up here).
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ confirm: z.literal("SUPPRIMER") }).parse(d))
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: storedDocuments } = await supabaseAdmin.storage.from("kyc-documents").list(userId, { limit: 1000 });
    if (storedDocuments?.length) {
      await supabaseAdmin.storage.from("kyc-documents").remove(storedDocuments.map((document) => `${userId}/${document.name}`));
    }

    // Belt & suspenders: explicit purge of app rows before deleting the auth user
    await supabaseAdmin.from("sms_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("campaign_executions").delete().eq("user_id", userId);
    await supabaseAdmin.from("campaigns").delete().eq("user_id", userId);
    await supabaseAdmin.from("api_keys").delete().eq("user_id", userId);
    await supabaseAdmin.from("orders").delete().eq("user_id", userId);
    await supabaseAdmin.from("signup_applications").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Contact submissions have no user_id link — leave the historical rows in place.

    // Finally delete auth user (auth admin)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
