import { createServerFn } from "@tanstack/react-start";

/** Assistant public : aucune connexion requise. */
export const askPatcoFn = createServerFn({ method: "POST" })
  .inputValidator((input: { session_id: string; message: string }) => {
    const session_id = String(input?.session_id ?? "").slice(0, 64);
    const message = String(input?.message ?? "").trim().slice(0, 1000);
    if (!session_id) throw new Error("Session invalide.");
    if (!message) throw new Error("Message vide.");
    return { session_id, message };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistant non configuré.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { askPatco, mergeLead } = await import("@/lib/patco.server");

    // Fiche contact (mémoire durable de la personne)
    const { data: existing } = await supabaseAdmin
      .from("assistant_leads")
      .select("*")
      .eq("session_id", data.session_id)
      .maybeSingle();

    let lead = existing;
    if (!lead) {
      const { data: created } = await supabaseAdmin
        .from("assistant_leads")
        .insert({ session_id: data.session_id })
        .select("*")
        .single();
      lead = created;
    }

    // Mémoire conversationnelle
    const { data: history } = await supabaseAdmin
      .from("assistant_messages")
      .select("role, content")
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true })
      .limit(30);

    const result = await askPatco({
      supabaseAdmin,
      apiKey,
      history: (history ?? []) as { role: "user" | "assistant"; content: string }[],
      message: data.message,
      lead,
    });

    await supabaseAdmin.from("assistant_messages").insert([
      { session_id: data.session_id, lead_id: lead?.id ?? null, role: "user", content: data.message },
      { session_id: data.session_id, lead_id: lead?.id ?? null, role: "assistant", content: result.reply },
    ]);

    const patch = mergeLead(lead, result.lead);
    await supabaseAdmin
      .from("assistant_leads")
      .update({
        ...patch,
        message_count: (lead?.message_count ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("session_id", data.session_id);

    return { reply: result.reply };
  });

/** Historique d'une session (pour reprendre la conversation au rechargement). */
export const getPatcoHistory = createServerFn({ method: "POST" })
  .inputValidator((input: { session_id: string }) => ({ session_id: String(input?.session_id ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    if (!data.session_id) return { messages: [] as { role: string; content: string }[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("assistant_messages")
      .select("role, content")
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true })
      .limit(50);
    return { messages: (rows ?? []) as { role: string; content: string }[] };
  });
