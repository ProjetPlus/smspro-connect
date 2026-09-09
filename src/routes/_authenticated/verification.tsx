import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { submitSignupApplication, getMySignupApplication } from "@/lib/signup.functions";
import {
  CLIENT_TYPES,
  ID_TYPES,
  representativeDocs,
  structureDocs,
  type DocSpec,
} from "@/lib/client-types";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
  head: () => ({
    meta: [
      { title: "Vérification de mon compte — SMS Pro Mobile" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const STEPS = ["Statut & expéditeur", "Documents", "Pièce d'identité", "Vérification"];
const MAX_MB = 8;
const inp = "w-full text-sm px-3 py-2 border border-border rounded-sm bg-background";

type Form = {
  civility: string;
  job_title: string;
  structure: string;
  client_type: string;
  client_type_other: string;
  website: string;
  sender_id: string;
  sample_message: string;
  id_document_type: string;
  is_legal_representative: boolean;
  rep_first_name: string;
  rep_last_name: string;
  rep_email: string;
  rep_mobile: string;
};

const EMPTY: Form = {
  civility: "M.",
  job_title: "",
  structure: "",
  client_type: "",
  client_type_other: "",
  website: "",
  sender_id: "",
  sample_message: "",
  id_document_type: "CNI",
  is_legal_representative: true,
  rep_first_name: "",
  rep_last_name: "",
  rep_email: "",
  rep_mobile: "",
};

function VerificationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [certified, setCertified] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: application } = useQuery({
    queryKey: ["my-signup-application"],
    queryFn: () => getMySignupApplication(),
  });

  useEffect(() => {
    if (application) {
      setF((p) => ({
        ...p,
        civility: application['civility'] ?? p.civility,
        job_title: application['job_title'] ?? "",
        structure: application['structure'] ?? "",
        client_type: application['client_type'] ?? "",
        client_type_other: application['client_type_other'] ?? "",
        website: application['website'] ?? "",
        sender_id: application['sender_id'] ?? "",
        sample_message: application['sample_message'] ?? "",
        id_document_type: application['id_document_type'] ?? "CNI",
      }));
    }
  }, [application]);

  const docsStructure = useMemo<DocSpec[]>(() => (f.client_type ? structureDocs(f.client_type) : []), [f.client_type]);
  const docsId = useMemo<DocSpec[]>(() => representativeDocs(f.id_document_type), [f.id_document_type]);

  const pending = application && application['status'] === "pending";
  const approved = application && application['status'] === "approved";

  async function pick(key: string, file: File | null) {
    if (!file) {
      setFiles((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Fichier trop volumineux (max ${MAX_MB} Mo)`);
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name))
      return toast.error("Formats acceptés : PDF, JPG, PNG");
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validSignature =
      file.type === "application/pdf"
        ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
        : file.type === "image/png"
          ? bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
          : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!validSignature) return toast.error("Le contenu du fichier ne correspond pas à son format.");
    setFiles((p) => ({ ...p, [key]: file }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!f.client_type) return "Veuillez choisir votre type de client / statut.";
      if (f.client_type === "Autre" && !f.client_type_other) return "Veuillez préciser votre statut.";
      if (!f.structure) return "Le nom de la structure est obligatoire.";
      if (!/^[A-Za-z0-9 _-]{3,11}$/.test(f.sender_id))
        return "Nom d'expéditeur invalide (3 à 11 caractères, lettres et chiffres).";
    }
    if (step === 1) {
      const missing = docsStructure.filter((d) => d.required && !files[d.key]);
      if (missing.length) return `Documents obligatoires manquants : ${missing.map((m) => m.label).join(", ")}`;
    }
    if (step === 2) {
      const missing = docsId.filter((d) => d.required && !files[d.key]);
      if (missing.length) return `Pièce d'identité incomplète : ${missing.map((m) => m.label).join(", ")}`;
    }
    if (step === 3 && !certified) return "Veuillez certifier l'exactitude des informations.";
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    const err = validateStep();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Session expirée. Reconnectez-vous.");

      const allDocs = [...docsStructure, ...docsId];
      const uploaded: {
        key: string;
        label: string;
        path: string;
        name: string;
        size: number;
        mime_type: "application/pdf" | "image/jpeg" | "image/png";
      }[] = [];
      for (const d of allDocs) {
        const file = files[d.key];
        if (!file) continue;
        const path = `${uid}/${d.key}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage
          .from("kyc-documents")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(`Envoi du document « ${d.label} » impossible : ${error.message}`);
        uploaded.push({
          key: d.key,
          label: d.label,
          path,
          name: file.name,
          size: file.size,
          mime_type: file.type as "application/pdf" | "image/jpeg" | "image/png",
        });
      }

      await submitSignupApplication({
        data: {
          email: profile?.email ?? "",
          mobile: profile?.phone_e164 ?? profile?.phone ?? "",
          civility: f.civility,
          last_name: (profile?.full_name ?? "").split(" ").slice(1).join(" ") || (profile?.full_name ?? "—"),
          first_name: (profile?.full_name ?? "").split(" ")[0] || "—",
          country: profile?.country ?? "Côte d'Ivoire",
          city: profile?.city ?? null,
          job_title: f.job_title || null,
          structure: f.structure,
          client_type: f.client_type,
          client_type_other: f.client_type_other || null,
          website: f.website || null,
          sender_id: f.sender_id.toUpperCase(),
          sample_message: f.sample_message || null,
          package_slug: null,
          id_document_type: f.id_document_type as "CNI" | "Passeport" | "Permis de conduire",
          is_legal_representative: f.is_legal_representative,
          representative: f.is_legal_representative
            ? {}
            : {
                first_name: f.rep_first_name,
                last_name: f.rep_last_name,
                email: f.rep_email,
                mobile: f.rep_mobile,
              },
          documents: uploaded,
          certified: true,
          gdpr_consent: true,
        },
      });

      toast.success(
        "Dossier transmis à l'administration. Veuillez acheter un pack pour faire valider votre demande.",
        { duration: 8000 },
      );
      navigate({ to: "/tarifs" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi du dossier");
    } finally {
      setBusy(false);
    }
  }

  if (approved) {
    return (
      <DashboardLayout title="Vérification de mon compte">
        <div className="bg-background border border-border rounded-sm p-6">
          <h2 className="font-display font-bold text-lg">Compte validé</h2>
          <p className="text-sm text-foreground/70 mt-2">
            Votre dossier est approuvé et votre nom d'expéditeur{" "}
            <span className="font-mono">{application?.['sender_id']}</span> est actif.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vérification de mon compte">
      {pending && (
        <div className="mb-6 p-4 border border-primary/40 bg-primary/5 rounded-sm text-sm">
          Votre dossier est en cours d'examen.{" "}
          {application?.['paid_at']
            ? "Votre pack est payé : la validation finale est en cours."
            : "Veuillez acheter un pack pour faire valider votre demande."}
        </div>
      )}

      <ol className="flex flex-wrap gap-2 mb-8 text-[10px] font-mono uppercase tracking-widest">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`px-2 py-1 rounded-sm border ${
              i === step
                ? "bg-primary text-primary-foreground border-primary"
                : i < step
                  ? "border-primary text-primary"
                  : "border-border text-foreground/40"
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="bg-background border border-border rounded-sm p-5 sm:p-7 space-y-5">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type de client / Statut *">
              <select className={inp} value={f.client_type} onChange={(e) => set("client_type", e.target.value)}>
                <option value="">— Sélectionner —</option>
                {CLIENT_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {f.client_type === "Autre" && (
              <Field label="Précisez *">
                <input className={inp} value={f.client_type_other} onChange={(e) => set("client_type_other", e.target.value)} />
              </Field>
            )}
            <Field label="Nom de la structure *">
              <input className={inp} value={f.structure} onChange={(e) => set("structure", e.target.value)} />
            </Field>
            <Field label="Fonction">
              <input className={inp} value={f.job_title} onChange={(e) => set("job_title", e.target.value)} />
            </Field>
            <Field label="Civilité">
              <select className={inp} value={f.civility} onChange={(e) => set("civility", e.target.value)}>
                <option>M.</option>
                <option>Mme</option>
                <option>Mlle</option>
              </select>
            </Field>
            <Field label="Site internet">
              <input className={inp} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Nom d'expéditeur souhaité *">
              <input
                className={inp}
                maxLength={11}
                value={f.sender_id}
                onChange={(e) => set("sender_id", e.target.value.toUpperCase())}
                placeholder="MASTRUCTURE"
              />
              <span className="text-xs text-foreground/50">
                Nom affiché chez le destinataire (11 caractères max). Il reste grisé tant que le compte n'est pas validé.
              </span>
            </Field>
            <Field label="Exemplaire de message à diffuser" full>
              <textarea
                className={`${inp} min-h-24`}
                value={f.sample_message}
                onChange={(e) => set("sample_message", e.target.value)}
                maxLength={1000}
              />
            </Field>
            <Field label="Je suis le représentant légal / responsable" full>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.is_legal_representative}
                  onChange={(e) => set("is_legal_representative", e.target.checked)}
                />
                Utiliser mes informations comme responsable de la structure
              </label>
            </Field>
            {!f.is_legal_representative && (
              <>
                <Field label="Nom du responsable">
                  <input className={inp} value={f.rep_last_name} onChange={(e) => set("rep_last_name", e.target.value)} />
                </Field>
                <Field label="Prénom du responsable">
                  <input className={inp} value={f.rep_first_name} onChange={(e) => set("rep_first_name", e.target.value)} />
                </Field>
                <Field label="E-mail du responsable">
                  <input className={inp} value={f.rep_email} onChange={(e) => set("rep_email", e.target.value)} />
                </Field>
                <Field label="Mobile du responsable">
                  <input className={inp} value={f.rep_mobile} onChange={(e) => set("rep_mobile", e.target.value)} />
                </Field>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">
              Documents requis pour : <b>{f.client_type}</b>
            </p>
            {docsStructure.map((d) => (
              <Upload key={d.key} spec={d} file={files[d.key]} onPick={(file) => pick(d.key, file)} />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Type de pièce d'identité *">
              <select className={inp} value={f.id_document_type} onChange={(e) => set("id_document_type", e.target.value)}>
                {ID_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            {docsId.map((d) => (
              <Upload key={d.key} spec={d} file={files[d.key]} onPick={(file) => pick(d.key, file)} />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-sm">
            <Recap
              title="Titulaire du compte"
              items={[
                ["Nom", profile?.full_name ?? "—"],
                ["E-mail", profile?.email ?? "—"],
                ["Mobile", profile?.phone_e164 ?? profile?.phone ?? "—"],
                ["Pays / Ville", `${profile?.country ?? "—"}${profile?.city ? ` · ${profile.city}` : ""}`],
              ]}
            />
            <Recap
              title="Structure & expéditeur"
              items={[
                ["Structure", f.structure],
                ["Type de client", f.client_type === "Autre" ? `Autre — ${f.client_type_other}` : f.client_type],
                ["Fonction", f.job_title || "—"],
                ["Nom d'expéditeur", f.sender_id],
              ]}
            />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">Documents</div>
              <ul className="list-disc pl-5 text-foreground/70">
                {[...docsStructure, ...docsId].map((d) => (
                  <li key={d.key}>
                    {d.label} — {files[d.key]?.name ?? (d.required ? "manquant" : "non fourni")}
                  </li>
                ))}
              </ul>
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} className="mt-1" />
              <span>Je certifie que les informations fournies sont exactes et que les documents transmis sont authentiques.</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-sm px-4 py-2 border border-border rounded-sm disabled:opacity-40"
          >
            Retour
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm">
              Continuer
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="text-sm font-semibold px-5 py-2 bg-primary text-primary-foreground rounded-sm disabled:opacity-50"
            >
              {busy ? "Envoi…" : "Soumettre mon dossier"}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
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

function Upload({ spec, file, onPick }: { spec: DocSpec; file?: File; onPick: (f: File | null) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border border-border rounded-sm">
      <div className="min-w-0">
        <div className="text-sm font-semibold">
          {spec.label} {spec.required ? "*" : <span className="text-foreground/40">(facultatif)</span>}
        </div>
        <div className="text-xs text-foreground/50 truncate">{file ? file.name : "PDF, JPG ou PNG — 8 Mo max"}</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold px-3 py-2 border border-border rounded-sm cursor-pointer hover:bg-muted">
          {file ? "Remplacer" : "Importer"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
        {file && (
          <button type="button" onClick={() => onPick(null)} className="text-xs px-3 py-2 border border-border rounded-sm hover:bg-muted">
            Supprimer
          </button>
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
