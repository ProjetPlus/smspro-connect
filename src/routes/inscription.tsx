import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { createSignupAccount } from "@/lib/signup-account.functions";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp.functions";
import { PasswordField } from "@/components/password-field";
import { CEDEAO_COUNTRIES } from "@/lib/cedeao";

export const Route = createFileRoute("/inscription")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Créer un compte SMS Pro Mobile — Inscription en 1 minute" },
      {
        name: "description",
        content:
          "Ouvrez votre compte SMS Pro Mobile en une étape : nom, e-mail, mot de passe, numéro et pays. La vérification KYC se fait ensuite depuis votre espace client.",
      },
      { property: "og:title", content: "Créer un compte SMS Pro Mobile" },
      { property: "og:description", content: "Inscription simplifiée : une seule étape, puis vérification par SMS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const DEFAULT_COUNTRY = "Côte d'Ivoire";
const inp = "w-full text-sm px-3 py-2 border border-border rounded-sm bg-background";

type Form = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dial_code: string;
  phone: string;
  country: string;
  city: string;
};

const EMPTY: Form = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  dial_code: "+225",
  phone: "",
  country: DEFAULT_COUNTRY,
  city: "",
};

function SignupPage() {
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(EMPTY);
  const [gdpr, setGdpr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  function selectCountry(name: string) {
    const country = CEDEAO_COUNTRIES.find((c) => c.name === name);
    setF((p) => ({ ...p, country: name, dial_code: country?.dial ?? p.dial_code }));
  }

  async function requestCode() {
    const result = await sendPhoneOtp({});
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setChannel(result.channel);
    setDestination(result.destination ?? "");
    setAwaitingCode(true);
    toast.success(
      result.channel === "sms"
        ? "Un code à 6 chiffres vient de vous être envoyé par SMS."
        : "Un code à 6 chiffres vient de vous être envoyé par e-mail.",
    );
    return true;
  }

  async function createAccount() {
    if (!f.first_name || !f.last_name || !f.email || !f.phone || !f.country) {
      return toast.error("Veuillez renseigner tous les champs obligatoires.");
    }
    const policyError = validatePasswordPolicy(f.password);
    if (policyError) return toast.error(policyError);
    if (!gdpr) return toast.error("Le consentement RGPD est obligatoire.");

    setBusy(true);
    try {
      const email = f.email.trim().toLowerCase();
      const account = await createSignupAccount({
        data: {
          email,
          password: f.password,
          first_name: f.first_name.trim(),
          last_name: f.last_name.trim(),
          dial_code: f.dial_code,
          phone: f.phone,
          country: f.country,
          city: f.city || null,
        },
      });
      if (!account.ok) throw new Error(account.error);

      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: f.password });
      if (signErr) throw new Error("Compte créé, mais la connexion a échoué. Connectez-vous depuis la page de connexion.");

      await requestCode();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la création du compte");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (code.length !== 6) return toast.error("Entrez le code à 6 chiffres.");
    setBusy(true);
    try {
      const result = await verifyPhoneOtp({ data: { code } });
      if (!result.ok) throw new Error(result.error);
      toast.success("Compte vérifié. Bienvenue !");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la vérification");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="px-4 sm:px-8 py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Inscription</div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl mt-2">Créer mon compte SMS Pro Mobile</h1>
          <p className="text-foreground/60 mt-2 text-sm">
            Une seule étape. La vérification de votre structure (KYC) se fera ensuite depuis votre espace client.
          </p>

          <div className="bg-background border border-border rounded-sm p-5 sm:p-7 mt-6 space-y-5">
            {!awaitingCode ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom *">
                    <input className={inp} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} autoComplete="family-name" />
                  </Field>
                  <Field label="Prénom *">
                    <input className={inp} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} autoComplete="given-name" />
                  </Field>
                  <Field label="E-mail *" full>
                    <input type="email" className={inp} value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                  </Field>
                  <Field label="Mot de passe * (10 caractères minimum)" full>
                    <PasswordField className={inp} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
                  </Field>
                  <Field label="Contact *" full>
                    <div className="flex gap-2">
                      <select
                        className={`${inp} w-40 shrink-0`}
                        value={f.dial_code}
                        onChange={(e) => set("dial_code", e.target.value)}
                        aria-label="Indicatif pays"
                      >
                        {CEDEAO_COUNTRIES.map((c) => (
                          <option key={c.iso} value={c.dial}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                      <input
                        className={inp}
                        value={f.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="07 00 00 00 00"
                      />
                    </div>
                  </Field>
                  <Field label="Pays *">
                    <select className={inp} value={f.country} onChange={(e) => selectCountry(e.target.value)}>
                      {CEDEAO_COUNTRIES.map((c) => (
                        <option key={c.iso} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ville">
                    <input className={inp} value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
                  </Field>
                </div>

                <p className="text-xs text-foreground/50">
                  En créant votre compte, vous acceptez nos{" "}
                  <Link to="/conditions" className="underline">conditions d'utilisation</Link> et notre{" "}
                  <Link to="/confidentialite" className="underline">politique de confidentialité</Link> (RGPD).
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-1" />
                  <span>J'accepte le traitement de mes données pour créer et sécuriser mon compte.</span>
                </label>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={createAccount}
                    disabled={busy}
                    className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50"
                  >
                    {busy ? "Création…" : "Créer mon compte"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-foreground/70">
                  Nous avons envoyé un code à 6 chiffres {channel === "sms" ? "par SMS au" : "par e-mail à"}{" "}
                  <strong>{destination}</strong>. Saisissez-le pour activer votre compte.
                </div>
                <Field label="Code de vérification *" full>
                  <input
                    className={inp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={busy}
                  className="text-xs underline text-foreground/60"
                >
                  Renvoyer le code
                </button>
                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={confirmCode}
                    disabled={busy}
                    className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50"
                  >
                    {busy ? "Vérification…" : "Valider mon compte"}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-sm text-foreground/60 mt-6">
            Vous avez déjà un compte ? <Link to="/auth" className="text-primary font-semibold">Se connecter</Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{label}</span>
      {children}
    </label>
  );
}
