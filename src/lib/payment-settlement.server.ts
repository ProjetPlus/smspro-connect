/**
 * Effets de bord après encaissement d'une commande (server only) :
 *  - marque le dossier de vérification comme payé,
 *  - informe le client par e-mail,
 *  - informe l'administration qu'un dossier est prêt pour validation finale.
 *
 * Idempotent : n'écrit le paiement qu'une fois par dossier.
 */
export async function afterOrderPaid(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, sms_volume, amount_fcfa, package_id, packages(name)")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.user_id) return;

    const packName = (order as { packages?: { name?: string } | null }).packages?.name ?? "Pack SMS";
    const now = new Date().toISOString();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();

    const { data: application } = await supabaseAdmin
      .from("signup_applications")
      .select("id, paid_at, structure, sender_id")
      .eq("user_id", order.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (application?.id && !application['paid_at']) {
      await supabaseAdmin
        .from("signup_applications")
        .update({ paid_at: now, payment_order_id: order.id })
        .eq("id", application.id);

      await supabaseAdmin.from("notifications").insert({
        audience: "admin",
        kind: "payment",
        title: `Pack payé — ${application['structure'] ?? profile?.full_name ?? "client"}`,
        body: `Le client a payé ${order.amount_fcfa?.toLocaleString("fr-FR")} FCFA (${packName}). Le dossier peut être validé.`,
        link: "/admin/signups",
        payload: { order_id: order.id, application_id: application.id } as never,
      } as never);

      try {
        const { sendAdminEmail } = await import("./emails.server");
        await sendAdminEmail(
          "Pack payé — dossier prêt à valider",
          `Client : ${profile?.full_name ?? profile?.email ?? order.user_id}\nPack : ${packName}\nMontant : ${order.amount_fcfa} FCFA\nExpéditeur demandé : ${application['sender_id'] ?? "—"}`,
        );
      } catch {
        /* l'e-mail ne doit jamais bloquer l'encaissement */
      }
    }

    await supabaseAdmin.from("notifications").insert({
      audience: "user",
      user_id: order.user_id,
      kind: "payment",
      title: "Paiement confirmé",
      body: `Votre paiement pour le pack ${packName} est confirmé.`,
      link: "/dashboard/orders",
      payload: { order_id: order.id } as never,
    } as never);

    if (profile?.email) {
      try {
        const { sendPaymentConfirmedEmail } = await import("./emails.server");
        await sendPaymentConfirmedEmail(profile.email, packName, order.sms_volume ?? 0);
      } catch {
        /* idem */
      }
    }
  } catch {
    /* aucune erreur de notification ne doit invalider un paiement */
  }
}
