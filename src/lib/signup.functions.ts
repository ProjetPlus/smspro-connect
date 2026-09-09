import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "./server-function-helpers";

export const submitSignupApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    email: z.string().trim().email().max(320),
    mobile: z.string().trim().min(6).max(30),
    civility: z.string().trim().max(20).optional().nullable(),
    last_name: z.string().trim().min(1).max(120),
    first_name: z.string().trim().min(1).max(120),
    country: z.string().trim().min(1).max(80),
    city: z.string().trim().max(120).optional().nullable(),
    job_title: z.string().trim().max(120).optional().nullable(),
    structure: z.string().trim().max(200).optional().nullable(),
    client_type: z.string().trim().min(1).max(120),
    client_type_other: z.string().trim().max(200).optional().nullable(),
    website: z.union([z.literal(""), z.string().url().max(300)]).optional().nullable(),
    sender_id: z.string().trim().regex(/^[A-Za-z0-9 _-]{3,11}$/),
    sample_message: z.string().trim().max(1000).optional().nullable(),
    package_slug: z.string().trim().max(60).optional().nullable(),
    id_document_type: z.enum(["CNI", "Passeport", "Permis de conduire"]),
    is_legal_representative: z.boolean(),
    representative: z.record(z.string(), z.string().max(320)).default({}),
    certified: z.literal(true),
    gdpr_consent: z.literal(true),
    documents: z.array(z.object({
      key: z.string().regex(/^[a-z0-9_]{1,60}$/),
      label: z.string().trim().min(1).max(160),
      path: z.string().trim().min(1).max(500),
      name: z.string().trim().min(1).max(255),
      size: z.number().int().positive().max(8 * 1024 * 1024),
      mime_type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    })).min(1).max(20),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { validateKycDocuments } = await import("./signup-validation.server");
    await validateKycDocuments(context.supabase, context.userId, data.documents);
    const { certified, gdpr_consent, ...application } = data;
    const now = new Date().toISOString();
    const { data: inserted, error } = await context.supabase
      .from("signup_applications")
      .insert({
        ...application,
        user_id: context.userId,
        status: "pending",
        gdpr_consent_at: now,
        certified_at: now,
        documents_validation_status: "pending",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const applicationId = (inserted as { id: string } | null)?.id ?? null;

    await context.supabase
      .from("profiles")
      .update({
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        phone: data.mobile,
        company: data.structure ?? null,
        gdpr_consent_at: now,
      })
      .eq("id", context.userId);

    // Notifie l'administrateur avec l'intégralité du dossier
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const body = [
        `Client : ${application.civility ?? ""} ${application.first_name} ${application.last_name}`.trim(),
        `Email : ${application.email}`,
        `Mobile : ${application.mobile}`,
        `Pays / Ville : ${application.country}${application.city ? ` · ${application.city}` : ""}`,
        `Fonction : ${application.job_title || "—"}`,
        `Structure : ${application.structure || "—"}`,
        `Type de client : ${application.client_type}${application.client_type_other ? ` (${application.client_type_other})` : ""}`,
        `Site internet : ${application.website || "—"}`,
        `Nom d'expéditeur : ${application.sender_id}`,
        `Pack : ${application.package_slug || "—"}`,
        `Exemple de message : ${application.sample_message || "—"}`,
        `Pièce d'identité : ${application.id_document_type}`,
        `Représentant légal : ${application.is_legal_representative ? "le titulaire du compte" : JSON.stringify(application.representative)}`,
        `Documents (${application.documents.length}) : ${application.documents.map((d) => `${d.label} → ${d.name}`).join(" | ")}`,
      ].join("\n");

      let emailStatus = "skipped";
      let emailError: string | null = null;
      let emailSentAt: string | null = null;
      try {
        const { sendAdminSignupEmail } = await import("./notifications.server");
        const result = await sendAdminSignupEmail(body, application.email);
        emailStatus = result.sent ? "sent" : "skipped";
        emailSentAt = result.sent ? new Date().toISOString() : null;
        if (!result.sent) emailError = result.reason ?? null;
      } catch (e) {
        emailStatus = "failed";
        emailError = e instanceof Error ? e.message : "Erreur d'envoi inconnue";
      }

      await supabaseAdmin.from("notifications").insert({
        audience: "admin",
        kind: "signup",
        title: `Nouveau dossier d'inscription — ${application.structure || `${application.first_name} ${application.last_name}`}`,
        body,
        link: "/admin/signups",
        payload: application as never,
        signup_application_id: applicationId,
        email_status: emailStatus,
        email_error: emailError,
        email_sent_at: emailSentAt,
      } as never);
    } catch {
      /* la notification ne doit jamais bloquer la soumission du dossier */
    }

    return { ok: true, application_id: applicationId };
  });


export const getMySignupApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("signup_applications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

export const listSignupApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context);
    const { data, error } = await context.supabase
      .from("signup_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewSignupApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "approved", "rejected"]),
        documents_validation_status: z.enum(["pending", "valid", "rejected"]),
        admin_notes: z.string().max(2000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("signup_applications")
      .update({
        status: data.status,
        documents_validation_status: data.documents_validation_status,
        documents_checked_at: data.documents_validation_status === "pending" ? null : now,
        admin_notes: data.admin_notes ?? null,
        reviewed_at: now,
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Validation → crédit automatique du pack (crédits SMS + commande + notification client)
    let credited = 0;
    if (data.status === "approved") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: app } = await supabaseAdmin
        .from("signup_applications")
        .select("id, user_id, package_slug, credited_at, email")
        .eq("id", data.id)
        .maybeSingle();

      if (app?.user_id && !app.credited_at && app.package_slug) {
        const { data: pack } = await supabaseAdmin
          .from("packages")
          .select("id, name, sms_volume, price_fcfa")
          .eq("slug", app.package_slug)
          .maybeSingle();

        if (pack) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("sms_credits")
            .eq("id", app.user_id)
            .maybeSingle();

          credited = pack.sms_volume;
          await supabaseAdmin
            .from("profiles")
            .update({ sms_credits: (profile?.sms_credits ?? 0) + credited })
            .eq("id", app.user_id);

          await supabaseAdmin.from("orders").insert({
            user_id: app.user_id,
            package_id: pack.id,
            amount_fcfa: pack.price_fcfa,
            sms_volume: pack.sms_volume,
            status: "paid",
            provider: "admin_validation",
          } as never);

          await supabaseAdmin
            .from("signup_applications")
            .update({ credited_at: now, credited_sms: credited })
            .eq("id", data.id);

          await supabaseAdmin.from("notifications").insert({
            audience: "user",
            user_id: app.user_id,
            kind: "account_approved",
            title: "Votre compte est validé",
            body: `Votre dossier est approuvé. Le pack ${pack.name} a été crédité : ${credited.toLocaleString("fr-FR")} SMS disponibles. Vous pouvez lancer vos campagnes dès maintenant.`,
            link: "/dashboard/campaigns",
            payload: { package: pack.name, sms: credited } as never,
          } as never);
        }
      }
    }

    return { ok: true, credited };
  });

export const deleteSignupApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context);
    const { error } = await context.supabase.from("signup_applications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
