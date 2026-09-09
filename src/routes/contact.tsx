import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteLayout, PageHero } from "@/components/site-chrome";
import { submitContact } from "@/lib/contact.functions";
import { track } from "@/lib/analytics";

const WHATSAPP_NUMBER = "2250700000000";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Support & Devis SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Contactez l'équipe SMS Pro Mobile par WhatsApp, téléphone ou formulaire. Support commercial et technique en Côte d'Ivoire.",
      },
      { property: "og:title", content: "Contact — SMS Pro Mobile" },
      {
        property: "og:description",
        content:
          "Une question, un devis, un accès API ? Notre équipe basée en Côte d'Ivoire vous répond rapidement.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://smsmobilepro.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://smsmobilepro.lovable.app/contact" }],
  }),
});

type Status = "idle" | "submitting" | "success" | "error";

function ContactPage() {
  const router = useRouter();
  void router; // reserved for future navigation
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    subject: "Demande d'information",
    message: "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const buildWhatsAppUrl = () => {
    const lines = [
      `Bonjour SMS Pro Mobile,`,
      form.name ? `Je suis ${form.name}${form.company ? ` (${form.company})` : ""}.` : "",
      form.subject ? `Sujet : ${form.subject}` : "",
      form.message || "Je souhaite des informations sur vos services SMS.",
    ].filter(Boolean);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const onWhatsApp = () => {
    track("cta_whatsapp_click", { location: "contact_form", subject: form.subject });
    window.open(buildWhatsAppUrl(), "_blank", "noopener,noreferrer");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    try {
      await submitContact({ data: form });
      track("contact_form_submit", { subject: form.subject });
      setStatus("success");
      setForm((f) => ({ ...f, message: "" }));
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Parlons de <span className="text-primary">votre projet</span>
          </>
        }
        description="Une question technique, un besoin de devis sur mesure ou un accès API ? Nous vous répondons rapidement."
      />

      <section className="px-4 sm:px-8 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-[1fr_1.3fr]">
          {/* Contact info */}
          <div className="space-y-4">
            <div className="p-5 bg-muted rounded-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                WhatsApp
              </div>
              <p className="font-display font-bold text-lg mb-3 break-all">+225 07 00 00 00 00</p>
              <button
                type="button"
                onClick={onWhatsApp}
                className="inline-block w-full text-center bg-whatsapp text-background py-2.5 rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Discuter sur WhatsApp
              </button>
            </div>

            <div className="p-5 bg-muted rounded-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                Téléphone
              </div>
              <p className="font-display font-bold text-lg break-all">+225 07 00 00 00 00</p>
              <p className="text-xs text-foreground/60 mt-1">Lun-Ven, 8h-18h GMT</p>
            </div>

            <div className="p-5 bg-muted rounded-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                Email
              </div>
              <p className="font-display font-bold text-base sm:text-lg break-all">
                contact@smspromobile.ci
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 bg-background border border-border rounded-sm">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-6">
              Envoyez-nous un message
            </h2>

            {status === "success" ? (
              <div className="p-4 bg-success/10 border border-success/30 rounded-sm">
                <p className="font-semibold text-success">Message reçu !</p>
                <p className="text-sm text-foreground/70 mt-1">
                  Notre équipe vous répond sous 24h. Pour une réponse immédiate,{" "}
                  <button
                    onClick={onWhatsApp}
                    className="text-primary underline underline-offset-2"
                  >
                    contactez-nous sur WhatsApp
                  </button>
                  .
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-xs font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground"
                >
                  Envoyer un autre message →
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <Field label="Nom complet" required>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </Field>
                <Field label="Entreprise">
                  <input
                    type="text"
                    maxLength={200}
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" required>
                    <input
                      type="email"
                      required
                      maxLength={320}
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      type="tel"
                      maxLength={50}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </Field>
                </div>
                <Field label="Sujet">
                  <select
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    <option>Demande d'information</option>
                    <option>Devis sur mesure</option>
                    <option>Accès API Gateway</option>
                    <option>Support technique</option>
                  </select>
                </Field>
                <Field label="Message" required>
                  <textarea
                    rows={4}
                    required
                    maxLength={5000}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    className="w-full bg-muted border border-border rounded-sm px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </Field>
                <p className="text-[11px] text-foreground/50 leading-relaxed">
                  En envoyant ce formulaire, vous acceptez que vos données soient traitées pour
                  répondre à votre demande. Voir notre{" "}
                  <a href="/confidentialite" className="text-primary underline">
                    politique de confidentialité
                  </a>
                  .
                </p>
                {status === "error" && errorMsg && (
                  <p className="text-sm text-primary" role="alert">
                    {errorMsg}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
                  >
                    {status === "submitting" ? "Envoi..." : "Envoyer la demande"}
                  </button>
                  <button
                    type="button"
                    onClick={onWhatsApp}
                    className="flex-1 bg-whatsapp text-background py-3.5 rounded-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Ou WhatsApp
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60 font-mono">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      {children}
    </div>
  );
}
