import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { upsertCampaign, sendTestSms } from "@/lib/campaigns.functions";
import { listTemplates, upsertTemplate } from "@/lib/templates.functions";
import { Field } from "@/components/field";

const TYPES = [
  { id: "promo", label: "Promotion", hint: "Offres, soldes, remises", sample: "Bonjour {{nom}}, profitez de -20% chez nous jusqu'au {{date}}. Stop au 36000." },
  { id: "alerte", label: "Alerte / Notification", hint: "Information urgente ou rappel", sample: "Info {{nom}} : votre rendez-vous est confirmé pour le {{date}}." },
  { id: "transac", label: "Transactionnel", hint: "Confirmation, reçu, code", sample: "{{nom}}, votre commande {{ref}} est validée. Merci de votre confiance." },
  { id: "evenement", label: "Événement", hint: "Invitation, rappel de date", sample: "{{nom}}, rendez-vous le {{date}} à {{lieu}}. Entrée libre." },
] as const;

const VARIABLES = ["{{nom}}", "{{date}}", "{{ref}}", "{{lieu}}"];

const STEPS = ["Type", "Contenu", "Destinataires", "Programmation", "Aperçu & validation"];

export function CampaignWizard({
  initial,
  onDone,
  onCancel,
}: {
  initial: any | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string>("promo");
  const [name, setName] = useState(initial?.name ?? "");
  const [sender, setSender] = useState(initial?.sender_id ?? "SMSPRO");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [recipients, setRecipients] = useState(initial ? (initial.recipients as string[]).join("\n") : "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduled_at ? toLocalInput(initial.scheduled_at) : "",
  );
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Africa/Abidjan");
  const [recurrence, setRecurrence] = useState<string>(initial?.recurrence ?? "");
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    initial?.recurrence_end ? String(initial.recurrence_end).slice(0, 10) : "",
  );
  const [testNumbers, setTestNumbers] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const list = useMemo(
    () => recipients.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean),
    [recipients],
  );
  const charCount = message.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));
  const totalCredits = smsCount * list.length;

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: () => listTemplates(),
  });

  const saveTemplate = useMutation({
    mutationFn: () => upsertTemplate({ data: { name: name || "Modèle sans titre", category: type, content: message } }),
    onSuccess: () => { toast.success("Modèle enregistré"); void refetchTemplates(); },
    onError: (e: any) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () =>
      sendTestSms({
        data: {
          recipients: testNumbers.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3),
          sender_id: sender,
          message: preview(message, 0),
        },
      }),
    onSuccess: (r) => toast.success(`Test envoyé : ${r.total - r.failed}/${r.total} réussi(s)`),
    onError: (e: any) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (asDraft: boolean) =>
      upsertCampaign({
        data: {
          id: initial?.id,
          name,
          sender_id: sender,
          message,
          recipients: list,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          recurrence: recurrence ? (recurrence as "daily" | "weekly" | "monthly") : null,
          recurrence_end: recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null,
          save_as_draft: asDraft,
        },
      }),
    onSuccess: (_r, asDraft) => {
      toast.success(asDraft ? "Brouillon enregistré" : scheduledAt || recurrence ? "Campagne programmée" : "Campagne prête à l'envoi");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stepValid = [
    Boolean(type && name.trim()),
    message.trim().length > 0 && sender.trim().length > 0,
    list.length > 0,
    true,
    confirmed,
  ][step];

  return (
    <div className="bg-background border border-border rounded-sm p-5 mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className={`px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider ${
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-foreground text-background" : "bg-muted text-foreground/50"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom de la campagne" className="sm:col-span-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Promo rentrée 2026"
              className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
          </Field>
          {TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => { setType(t.id); if (!message) setMessage(t.sample); }}
              className={`text-left p-4 rounded-sm border ${type === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary"}`}>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs text-foreground/50 mt-1">{t.hint}</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom d'expéditeur (11 car. max)">
            <input value={sender} onChange={(e) => setSender(e.target.value)} maxLength={11}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
          </Field>
          <Field label="Modèle enregistré">
            <select value="" onChange={(e) => {
              const t = (templates as any[]).find((x) => x.id === e.target.value);
              if (t) setMessage(t.content);
            }} className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background">
              <option value="">Utiliser un modèle…</option>
              {(templates as any[]).map((t) => <option key={t.id} value={t.id}>{t.name} · {t.category}</option>)}
            </select>
          </Field>
          <Field label="Message" hint={`${charCount}/1000 caractères · ${smsCount} SMS par destinataire`} className="sm:col-span-2">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={1000}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-foreground/50">Variables :</span>
            {VARIABLES.map((v) => (
              <button key={v} type="button" onClick={() => setMessage((m: string) => `${m}${v}`)}
                className="px-2 py-1 text-xs font-mono border border-border rounded-sm hover:border-primary">{v}</button>
            ))}
            <button type="button" disabled={!message || saveTemplate.isPending} onClick={() => saveTemplate.mutate()}
              className="ml-auto px-3 py-1.5 text-xs border border-border rounded-sm hover:border-primary disabled:opacity-40">
              Enregistrer comme modèle
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3">
          <Field label="Destinataires" hint={`${list.length} numéro(s) détecté(s)`}>
            <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={7}
              placeholder="+2250707000000&#10;+2250505000000"
              className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
          </Field>
          <div className="text-xs text-foreground/60">
            Coût estimé : <span className="font-mono font-semibold">{totalCredits.toLocaleString("fr-FR")}</span> crédits SMS.
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date et heure d'envoi" hint="Laissez vide pour un envoi immédiat">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
          </Field>
          <Field label="Fuseau horaire">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background">
              {["Africa/Abidjan", "Africa/Dakar", "Africa/Accra", "Africa/Lagos", "Africa/Ouagadougou", "Europe/Paris", "UTC"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
          <Field label="Récurrence">
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background">
              <option value="">Aucune (envoi unique)</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </Field>
          {recurrence && (
            <Field label="Fin de récurrence">
              <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
            </Field>
          )}
          <Field label="Envoi test (3 numéros max)" hint="Envoyé immédiatement, déduit de vos crédits" className="sm:col-span-2">
            <div className="flex gap-2">
              <input value={testNumbers} onChange={(e) => setTestNumbers(e.target.value)} placeholder="+2250707000000"
                className="flex-1 px-3 py-2 border border-border rounded-sm text-sm font-mono" />
              <button type="button" disabled={!testNumbers.trim() || !message || test.isPending} onClick={() => test.mutate()}
                className="px-4 py-2 text-sm font-semibold border border-border rounded-sm hover:border-primary disabled:opacity-40">
                {test.isPending ? "Envoi…" : "Envoyer un test"}
              </button>
            </div>
          </Field>
          {test.data && (
            <div className="sm:col-span-2 text-xs font-mono space-y-1">
              {test.data.results.map((r) => (
                <div key={r.phone}>{r.phone} → {r.status}{r.error ? ` (${r.error})` : ""}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-sm border border-border p-4 bg-muted">
            <div className="text-[10px] font-mono uppercase text-foreground/50 mb-2">Aperçu du SMS</div>
            <div className="rounded-lg bg-background border border-border p-3 text-sm whitespace-pre-wrap">
              <div className="text-[10px] font-mono uppercase text-foreground/50 mb-1">{sender || "EXPEDITEUR"}</div>
              {preview(message, 0) || "—"}
            </div>
          </div>
          <div className="text-sm space-y-1">
            <Line k="Type" v={TYPES.find((t) => t.id === type)?.label ?? type} />
            <Line k="Nom" v={name || "—"} />
            <Line k="Destinataires" v={String(list.length)} />
            <Line k="Segments SMS" v={String(smsCount)} />
            <Line k="Crédits requis" v={totalCredits.toLocaleString("fr-FR")} />
            <Line k="Programmation" v={scheduledAt ? `${new Date(scheduledAt).toLocaleString("fr-FR")} (${timezone})` : "Envoi immédiat"} />
            <Line k="Récurrence" v={recurrence || "Aucune"} />
            <Line k="Test effectué" v={test.data ? `Oui · ${test.data.total - test.data.failed}/${test.data.total}` : "Non"} />
            <label className="flex items-start gap-2 mt-3 text-xs">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
              <span>Je confirme le contenu, les destinataires et la programmation de cette campagne.</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end mt-5">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="px-4 py-2 text-sm border border-border rounded-sm">Retour</button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}
            className="px-4 py-2 text-sm bg-foreground text-background rounded-sm font-semibold disabled:opacity-40">
            Continuer
          </button>
        ) : (
          <>
            <button type="button" disabled={save.isPending} onClick={() => save.mutate(true)}
              className="px-4 py-2 text-sm border border-border rounded-sm font-semibold hover:border-primary">
              Enregistrer brouillon
            </button>
            <button type="button" disabled={!confirmed || save.isPending} onClick={() => save.mutate(false)}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-40">
              {save.isPending ? "…" : scheduledAt || recurrence ? "Programmer la campagne" : "Valider la campagne"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1">
      <span className="text-foreground/50 text-xs uppercase font-mono">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}

const SAMPLES: Record<string, string> = {
  "{{nom}}": "Awa",
  "{{date}}": new Date().toLocaleDateString("fr-FR"),
  "{{ref}}": "CMD-1042",
  "{{lieu}}": "Abidjan Plateau",
};

function preview(message: string, _i: number) {
  return Object.entries(SAMPLES).reduce((acc, [k, v]) => acc.split(k).join(v), message);
}

function toLocalInput(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
