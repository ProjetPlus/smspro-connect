import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const submitContact = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({
    name: z.string().trim().min(1).max(200),
    company: z.string().trim().max(200).optional().nullable(),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(50).optional().nullable(),
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const userAgent = req?.headers.get("user-agent") ?? null;

    const { error } = await supabaseAdmin.from("contact_submissions").insert({
      name: data.name,
      company: data.company ?? null,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject,
      message: data.message,
      source: "website_contact_form",
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[contact] insert failed:", error);
      throw new Error("Impossible d'enregistrer votre message. Réessayez.");
    }

    // Notification e-mail (infos@smspromobile.com + copie permanente).
    try {
      const { sendContactEmail } = await import("./emails.server");
      const result = await sendContactEmail(data);
      if (!result.sent) console.error("[contact] email not sent:", result.reason);
    } catch (mailError) {
      console.error("[contact] email failed:", mailError);
    }

    return { ok: true as const };
  });
