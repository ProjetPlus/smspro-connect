import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "./server-function-helpers";

export const listAssistantLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("assistant_leads")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    return { leads: data ?? [] };
  });

export const getAssistantConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { session_id: string }) => ({ session_id: String(input.session_id) }))
  .handler(async ({ context, data }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("assistant_messages")
      .select("role, content, created_at")
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true });
    return { messages: rows ?? [] };
  });

export const listAssistantKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("assistant_knowledge")
      .select("*")
      .order("updated_at", { ascending: false });
    return { items: data ?? [] };
  });

export const upsertAssistantKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; title: string; content: string; category: string; active: boolean }) => input)
  .handler(async ({ context, data }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category.trim() || "general",
      active: data.active,
    };
    if (!payload.title || !payload.content) throw new Error("Titre et contenu obligatoires.");
    const query = data.id
      ? supabaseAdmin.from("assistant_knowledge").update(payload).eq("id", data.id)
      : supabaseAdmin.from("assistant_knowledge").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAssistantKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ context, data }) => {
    await assertAdminRole(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assistant_knowledge").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
