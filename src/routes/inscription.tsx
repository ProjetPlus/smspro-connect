import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { submitSignupApplication } from "@/lib/signup.functions";
import { listPackages } from "@/lib/packages.functions";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { checkPasswordCompromised } from "@/lib/password.functions";
import { createSignupAccount } from "@/lib/signup-account.functions";
import { PasswordField } from "@/components/password-field";
import {
  CLIENT_TYPES, COUNTRIES, ID_TYPES, PRICING_TIERS, representativeDocs, structureDocs,
  type DocSpec,
} from "@/lib/client-types";

export const Route = createFileRoute("/inscription")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Créer un compte SMS Pro Mobile — Inscription professionnelle" },
      { name: "description", content: "Ouvrez votre compte SMS Pro Mobile en quelques minutes : identité, nom d'expéditeur, pack SMS et pièces justificatives adaptées à votre statut." },
      { property: "og:title", content: "Créer un compte SMS Pro Mobile" },
      { property: "og:description", content: "Inscription professionnelle : formulaire intelligent, documents demandés selon votre type de client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Form = {
  email: string; password: string; mobile: string; civility: string;
  last_name: string; first_name: string; country: string; city: string;
  job_title: string; structure: string; client_type: string; client_type_other: string;
  website: string; sender_id: string; sample_message: string; package_slug: string;
  id_document_type: string; is_legal_representative: boolean;
  rep_first_name: string; rep_last_name: string; rep_email: string; rep_mobile: string;
};

const EMPTY: Form = {
  email: "", password: "", mobile: "", civility: "M.", last_name: "", first_name: "",
  country: "Côte d'Ivoire", city: "", job_title: "", structure: "",
  client_type: "", client_type_other: "", website: "", sender_id: "", sample_message: "",
  package_slug: "", id_document_type: "CNI", is_legal_representative: true,
  rep_first_name: "", rep_last_name: "", rep_email: "", rep_mobile: "",
};

const STEPS = ["Identité", "SMS & pack", "Documents", "Pièce d'identité", "Vérification", "Création"];
const MAX_MB = 8;

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [certified, setCertified] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");


  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const { data: packages = [] } = useQuery({ queryKey: ["packages"], queryFn: () => listPackages() });

  const docsStructure = useMemo<DocSpec[]>(
    () => (f.client_type ? structureDocs(f.client_type) : []),
    [f.client_type],
  );
  const docsId = useMemo<DocSpec[]>(() => representativeDocs(f.id_document_type), [f.id_document_type]);

  async function pick(key: string, file: File | null) {
    if (!file) { setFiles((p) => { const n = { ...p }; delete n[key]; return n; }); return; }
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Fichier trop volumineux (max ${MAX_MB} Mo)`);
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name)) return toast.error("Formats acceptés : PDF, JPG, PNG");
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validSignature = file.type === "application/pdf"
      ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
      : file.type === "image/png"
        ? bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
        : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!validSignature) return toast.error("Le contenu du fichier ne correspond pas à son format.");
    setFiles((p) => ({ ...p, [key]: file }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!f.email || !f.mobile || !f.last_name || !f.first_name || !f.country || !f.client_type)
        return "Veuillez renseigner tous les champs obligatoires.";
      if (f.client_type === "Autre" && !f.client_type_other) return "Veuillez préciser votre statut.";
    }
    if (step === 1 && (!f.sender_id || !f.package_slug))
      return "Nom d'expéditeur et pack SMS sont obligatoires.";
    if (step === 2) {
      const missing = docsStructure.filter((d) => d.required && !files[d.key]);
      if (missing.length) return `Documents obligatoires manquants : ${missing.map((m) => m.label).join(", ")}`;
    }
    if (step === 3) {
      const missing = docsId.filter((d) => d.required && !files[d.key]);
      if (missing.length) return `Pièce d'identité incomplète : ${missing.map((m) => m.label).join(", ")}`;
    }
    if (step === 4 && !certified) return "Veuillez certifier l'exactitude des informations.";
    if (step === 5) {
      const policyError = validatePasswordPolicy(f.password);
      if (policyError) return policyError;
      if (!gdprConsent) return "Le consentement RGPD est obligatoire.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /** Étape 1 : créer le compte et envoyer le code de vérification email. */
  async function submit() {
    const err = validateStep();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const leak = await checkPasswordCompromised({ data: { password: f.password } });
      if (leak.compromised) {
        throw new Error("Ce mot de passe apparaît dans des fuites de données connues. Choisissez-en un autre.");
      }
      const email = f.email.trim().toLowerCase();
      const account = await createSignupAccount({
        data: {
          email,
          password: f.password,
          full_name: `${f.first_name} ${f.last_name}`.trim(),
          phone: f.mobile,
        },
      });
      if (!account.ok) throw new Error(account.error);

      // Vérification par code email quand elle est possible.
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (!otpErr) {
        setAwaitingCode(true);
        toast.success("Un code de vérification vient d'être envoyé à votre adresse email.");
        return;
      }

      // Repli : ouverture de session avec le mot de passe choisi, puis dépôt du dossier.
      const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: f.password,
      });
      if (signErr || !signed.session?.user) {
        throw new Error(
          account.exists
            ? "Un compte existe déjà avec cet email. Connectez-vous pour finaliser votre dossier."
            : "Impossible d'ouvrir votre session. Réessayez dans un instant.",
        );
      }
      await finalizeApplication(signed.session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la création du compte");
    } finally {
      setBusy(false);
    }
  }

  /** Dépôt des documents puis soumission du dossier (session déjà ouverte). */
  async function finalizeApplication(uid: string) {
    const email = f.email.trim().toLowerCase();
    const allDocs = [...docsStructure, ...docsId];
    const uploaded: { key: string; label: string; path: string; name: string; size: number; mime_type: "application/pdf" | "image/jpeg" | "image/png" }[] = [];
    for (const d of allDocs) {
      const file = files[d.key];
      if (!file) continue;
      const path = `${uid}/${d.key}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(`Upload ${d.label} : ${error.message}`);
      uploaded.push({ key: d.key, label: d.label, path, name: file.name, size: file.size, mime_type: file.type as "application/pdf" | "image/jpeg" | "image/png" });
    }

    await submitSignupApplication({
      data: {
        email, mobile: f.mobile, civility: f.civility,
        last_name: f.last_name, first_name: f.first_name, country: f.country, city: f.city,
        job_title: f.job_title, structure: f.structure, client_type: f.client_type,
        client_type_other: f.client_type_other || null, website: f.website || null,
        sender_id: f.sender_id.toUpperCase(), sample_message: f.sample_message || null,
        package_slug: f.package_slug || null, id_document_type: f.id_document_type,
        is_legal_representative: f.is_legal_representative,
        representative: f.is_legal_representative
          ? {}
          : {
              first_name: f.rep_first_name, last_name: f.rep_last_name,
              email: f.rep_email, mobile: f.rep_mobile,
            },
        documents: uploaded,
        certified: true,
        gdpr_consent: true,
      },
    });

    toast.success("Dossier soumis — votre compte est en cours de validation.");
    navigate({ to: "/dashboard" });
  }

  /** Étape 2 : vérifier le code, ouvrir la session, déposer les documents et soumettre le dossier. */
  async function confirmCode() {
    const token = code.trim();
    if (token.length < 6) return toast.error("Entrez le code à 6 chiffres reçu par email.");
    setBusy(true);
    try {
      const email = f.email.trim().toLowerCase();
      const { data: verified, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (verifyErr || !verified.session?.user) {
        throw new Error("Code invalide ou expiré. Demandez un nouveau code.");
      }
      await finalizeApplication(verified.session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la vérification");
    } finally {
      setBusy(false);
    }
  }


  async function resendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: f.email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
      });
      if (error) throw new Error("Envoi impossible pour le moment.");
      toast.success("Nouveau code envoyé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }


  return (
    <SiteLayout>
      <section className="px-4 sm:px-8 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Inscription</div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl mt-2">Créer mon compte SMS Pro Mobile</h1>
          <p className="text-foreground/60 mt-2 text-sm">
            Formulaire intelligent : nous ne demandons que les informations et documents correspondant à votre profil.
          </p>

          <ol className="flex flex-wrap gap-2 mt-6 mb-8 text-[10px] font-mono uppercase tracking-widest">
            {STEPS.map((s, i) => (
              <li key={s} className={`px-2 py-1 rounded-sm border ${i === step ? "bg-primary text-primary-foreground border-primary" : i < step ? "border-primary text-primary" : "border-border text-foreground/40"}`}>
                {i + 1}. {s}
              </li>
            ))}
          </ol>

          <div className="bg-background border border-border rounded-sm p-5 sm:p-7 space-y-5">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email *"><input type="email" className={inp} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <Field label="Mobile *"><input className={inp} value={f.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+225 07 00 00 00 00" /></Field>
                <Field label="Civilité">
                  <select className={inp} value={f.civility} onChange={(e) => set("civility", e.target.value)}>
                    <option>M.</option><option>Mme</option><option>Mlle</option>
                  </select>
                </Field>
                <Field label="Fonction"><input className={inp} value={f.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
                <Field label="Nom *"><input className={inp} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
                <Field label="Prénom *"><input className={inp} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
                <Field label="Pays *">
                  <select className={inp} value={f.country} onChange={(e) => set("country", e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Ville"><input className={inp} value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="Structure"><input className={inp} value={f.structure} onChange={(e) => set("structure", e.target.value)} /></Field>
                <Field label="Type de client / Statut *">
                  <select className={inp} value={f.client_type} onChange={(e) => set("client_type", e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {CLIENT_TYPES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                {f.client_type === "Autre" && (
                  <Field label="Précisez *" full>
                    <input className={inp} value={f.client_type_other} onChange={(e) => set("client_type_other", e.target.value)} />
                  </Field>
                )}
                <Field label="Je suis le représentant légal / responsable" full>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.is_legal_representative} onChange={(e) => set("is_legal_representative", e.target.checked)} />
                    Utiliser mes informations comme responsable de la structure
                  </label>
                </Field>
                {!f.is_legal_representative && (
                  <>
                    <Field label="Nom du responsable"><input className={inp} value={f.rep_last_name} onChange={(e) => set("rep_last_name", e.target.value)} /></Field>
                    <Field label="Prénom du responsable"><input className={inp} value={f.rep_first_name} onChange={(e) => set("rep_first_name", e.target.value)} /></Field>
                    <Field label="Email du responsable"><input className={inp} value={f.rep_email} onChange={(e) => set("rep_email", e.target.value)} /></Field>
                    <Field label="Mobile du responsable"><input className={inp} value={f.rep_mobile} onChange={(e) => set("rep_mobile", e.target.value)} /></Field>
                  </>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Site internet"><input className={inp} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
                  <Field label="Nom d'expéditeur souhaité *">
                    <input className={inp} maxLength={11} value={f.sender_id} onChange={(e) => set("sender_id", e.target.value.toUpperCase())} placeholder="AGRICAPITAL" />
                    <span className="text-xs text-foreground/50">Nom qui apparaîtra chez le destinataire lors de l'envoi du SMS (11 caractères max).</span>
                  </Field>
                </div>
                <Field label="Exemplaire de message à diffuser" full>
                  <textarea className={`${inp} min-h-24`} value={f.sample_message} onChange={(e) => set("sample_message", e.target.value)} maxLength={1000} />
                </Field>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">Grille tarifaire</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border">
                      <tbody>
                        {PRICING_TIERS.map((t) => (
                          <tr key={t.range} className="border-b border-border last:border-b-0">
                            <td className="p-2">{t.range}</td>
                            <td className="p-2 font-mono text-right">{t.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">Choix du pack *</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(packages as any[]).map((p) => (
                      <button type="button" key={p.slug} onClick={() => set("package_slug", p.slug)}
                        className={`text-left p-4 border rounded-sm ${f.package_slug === p.slug ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className="font-display font-bold">{p.name}</div>
                        <div className="text-sm text-foreground/60">{p.sms_volume.toLocaleString("fr-FR")} SMS</div>
                        <div className="font-mono text-sm mt-1">{p.price_fcfa.toLocaleString("fr-FR")} FCFA</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-foreground/60">
                  Documents requis pour : <b>{f.client_type}</b>
                </p>
                {docsStructure.map((d) => (
                  <Upload key={d.key} spec={d} file={files[d.key]} onPick={(file) => pick(d.key, file)} />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Field label="Type de pièce d'identité *">
                  <select className={inp} value={f.id_document_type} onChange={(e) => set("id_document_type", e.target.value)}>
                    {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                {docsId.map((d) => (
                  <Upload key={d.key} spec={d} file={files[d.key]} onPick={(file) => pick(d.key, file)} />
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 text-sm">
                <Recap title="Informations du compte" items={[
                  ["Nom", `${f.civility} ${f.first_name} ${f.last_name}`],
                  ["Email", f.email], ["Mobile", f.mobile],
                  ["Structure", f.structure || "—"], ["Fonction", f.job_title || "—"],
                  ["Type de client", f.client_type === "Autre" ? `Autre — ${f.client_type_other}` : f.client_type],
                  ["Pays / Ville", `${f.country}${f.city ? ` · ${f.city}` : ""}`],
                ]} />
                <Recap title="Paramètres SMS" items={[
                  ["Nom d'expéditeur", f.sender_id],
                  ["Pack choisi", (packages as any[]).find((p) => p.slug === f.package_slug)?.name ?? "—"],
                  ["Exemple de message", f.sample_message || "—"],
                ]} />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">Documents</div>
                  <ul className="list-disc pl-5 text-foreground/70">
                    {[...docsStructure, ...docsId].map((d) => (
                      <li key={d.key}>{d.label} — {files[d.key]?.name ?? (d.required ? "manquant" : "non fourni")}</li>
                    ))}
                  </ul>
                </div>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} className="mt-1" />
                  <span>Je certifie que les informations fournies sont exactes et que les documents transmis sont authentiques.</span>
                </label>
              </div>
            )}

            {step === 5 && !awaitingCode && (
              <div className="space-y-4">
                <Field label="Mot de passe * (10 caractères minimum)" full>
                  <PasswordField className={inp} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
                </Field>
                <p className="text-xs text-foreground/50">
                  En créant votre compte, vous acceptez nos{" "}
                  <Link to="/conditions" className="underline">conditions d'utilisation</Link> et notre{" "}
                  <Link to="/confidentialite" className="underline">politique de confidentialité</Link> (RGPD).
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} className="mt-1" />
                  <span>J'accepte le traitement strictement nécessaire de mes données et pièces KYC pour créer et sécuriser mon compte.</span>
                </label>
              </div>
            )}

            {step === 5 && awaitingCode && (
              <div className="space-y-4">
                <div className="text-sm text-foreground/70">
                  Nous avons envoyé un code à 6 chiffres à <strong>{f.email.trim().toLowerCase()}</strong>.
                  Saisissez-le pour confirmer que cette adresse est bien la vôtre et finaliser votre dossier.
                </div>
                <Field label="Code de vérification *" full>
                  <input
                    className={inp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </Field>
                <button type="button" onClick={resendCode} disabled={busy} className="text-xs underline text-foreground/60">
                  Renvoyer le code
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <button type="button" disabled={step === 0 || awaitingCode} onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-sm px-4 py-2 border border-border rounded-sm disabled:opacity-40">
                Retour
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next}
                  className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm">
                  Continuer
                </button>
              ) : awaitingCode ? (
                <button type="button" onClick={confirmCode} disabled={busy}
                  className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50">
                  {busy ? "Vérification…" : "Confirmer et soumettre"}
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={busy}
                  className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50">
                  {busy ? "Envoi…" : "Recevoir mon code de vérification"}
                </button>
              )}
            </div>

          </div>

          <p className="text-sm text-foreground/60 mt-6">
            Vous avez déjà un compte ? <Link to="/auth" className="text-primary font-semibold">Se connecter</Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

const inp = "w-full text-sm px-3 py-2 border border-border rounded-sm bg-background";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{label}</span>
      {children}
    </label>
  );
}

function Upload({ spec, file, onPick }: { spec: DocSpec; file?: File; onPick: (f: File | null) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border border-border rounded-sm">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{spec.label} {spec.required ? "*" : <span className="text-foreground/40">(facultatif)</span>}</div>
        <div className="text-xs text-foreground/50 truncate">{file ? file.name : "PDF, JPG ou PNG — 8 Mo max"}</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold px-3 py-2 border border-border rounded-sm cursor-pointer hover:bg-muted">
          {file ? "Remplacer" : "Importer"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
        {file && (
          <button type="button" onClick={() => onPick(null)}
            className="text-xs px-3 py-2 border border-border rounded-sm hover:bg-muted">Supprimer</button>
        )}
      </div>
    </div>
  );
}

function Recap({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">{title}</div>
      <dl className="grid gap-1 sm:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-foreground/50">{k} :</dt>
            <dd className="font-semibold break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
