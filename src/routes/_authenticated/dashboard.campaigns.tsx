import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import {
  listCampaigns, listExecutions, listCampaignMessages, upsertCampaign, sendCampaign,
  deleteCampaign, duplicateCampaign,
} from "@/lib/campaigns.functions";
import { listTemplates, upsertTemplate } from "@/lib/templates.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TABS = ["all", "draft", "scheduled", "recurring", "sent", "history"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/dashboard/campaigns")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: TABS.includes(search['tab'] as Tab) ? (search['tab'] as Tab) : ("all" as Tab),
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
  }),
  component: CampaignsPage,
  head: () => ({ meta: [{ title: "Campagnes SMS — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function CampaignsPage() {
  const qc = useQueryClient();
  const { tab, q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"], queryFn: () => listCampaigns(),
  });
  const { data: executions = [] } = useQuery({
    queryKey: ["executions"], queryFn: () => listExecutions({ data: {} }),
    enabled: tab === "history",
  });
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["campaign-messages", trackingId],
    queryFn: () => listCampaignMessages({ data: { campaign_id: trackingId ?? "", limit: 200 } }),
    enabled: Boolean(trackingId),
  });

  useEffect(() => {
    const channel = supabase
      .channel("campaign-delivery-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        qc.invalidateQueries({ queryKey: ["campaigns"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_messages" }, (payload) => {
        const row = (payload.new ?? payload.old) as { campaign_id?: string };
        if (row.campaign_id) qc.invalidateQueries({ queryKey: ["campaign-messages", row.campaign_id] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = tab === "all" || tab === "history" ? campaigns : campaigns.filter((c: any) => c.status === tab);
    if (needle) {
      list = list.filter((c: any) =>
        [c.name, c.sender_id, c.message].some((v: string) => (v ?? "").toLowerCase().includes(needle)));
    }
    return list;
  }, [campaigns, tab, q]);


  const send = useMutation({
    mutationFn: (id: string) => sendCampaign({ data: { id } }),
    onSuccess: (r) => { toast.success(`Envoyés: ${r.sent} / ${r.total} · Échecs: ${r.failed}`); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCampaign({ data: { id } }),
    onSuccess: () => { toast.success("Campagne supprimée"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
  });
  const dup = useMutation({
    mutationFn: (id: string) => duplicateCampaign({ data: { id } }),
    onSuccess: () => { toast.success("Dupliquée en brouillon"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
  });

  const counts = useMemo(() => ({
    all: campaigns.length,
    draft: campaigns.filter((c: any) => c.status === "draft").length,
    scheduled: campaigns.filter((c: any) => c.status === "scheduled").length,
    recurring: campaigns.filter((c: any) => c.status === "recurring").length,
    sent: campaigns.filter((c: any) => c.status === "sent").length,
  }), [campaigns]);

  return (
    <DashboardLayout title="Campagnes SMS">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap items-center text-xs">
          {TABS.map((t) => (
            <button key={t} onClick={() => setSearch({ tab: t })}
              className={`px-3 py-1.5 rounded-sm font-semibold uppercase tracking-wider ${tab === t ? "bg-foreground text-background" : "bg-background border border-border hover:border-primary"}`}>
              {labelFor(t)} {t !== "history" && counts[t as keyof typeof counts] !== undefined && <span className="opacity-60">({counts[t as keyof typeof counts]})</span>}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setSearch({ q: e.target.value })}
            placeholder="Rechercher…"
            className="px-3 py-1.5 border border-border rounded-sm bg-background min-w-[160px]"
          />
        </div>

        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark">
          + Nouvelle campagne
        </button>
      </div>

      {showForm && (
        <CampaignForm
          initial={editing}
          onDone={() => { setShowForm(false); setEditing(null); qc.invalidateQueries({ queryKey: ["campaigns"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {tab === "history" ? (
        <ExecutionsTable rows={executions} />
      ) : (
        <div className="bg-background border border-border rounded-sm overflow-hidden">
          {isLoading && <div className="p-6 text-sm text-center text-foreground/50">Chargement…</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-8 text-sm text-center text-foreground/50">
              Aucune campagne dans cette catégorie.
            </div>
          )}
          {filtered.map((c: any) => (
            <div key={c.id} className="p-4 border-b border-border last:border-b-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{c.name}</span>
                    <StatusChip status={c.status} />
                    {c.recurrence && <span className="text-[10px] font-mono uppercase text-foreground/50">↻ {c.recurrence}</span>}
                  </div>
                  <div className="text-xs text-foreground/50 mt-1">
                    De <span className="font-mono">{c.sender_id}</span> · {(c.recipients as string[])?.length ?? 0} destinataires · créée {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    {c.next_run_at && <> · prochaine exécution <span className="font-mono">{new Date(c.next_run_at).toLocaleString("fr-FR")}</span></>}
                    {c.last_run_at && <> · dernière <span className="font-mono">{new Date(c.last_run_at).toLocaleString("fr-FR")}</span></>}
                  </div>
                  <div className="text-sm text-foreground/70 mt-2 line-clamp-2">{c.message}</div>
                  <div className="text-xs text-foreground/50 mt-2 font-mono">✓ {c.delivered_count}/{c.sent_count} · ✗ {c.failed_count}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setTrackingId(trackingId === c.id ? null : c.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-sm border border-border hover:border-primary">
                    Suivi en direct
                  </button>
                  {(c.status === "draft" || c.status === "scheduled" || c.status === "recurring") && (
                    <button onClick={() => send.mutate(c.id)} disabled={send.isPending}
                      className="bg-foreground text-background px-3 py-1.5 text-xs font-semibold rounded-sm hover:opacity-90 disabled:opacity-50">
                      Envoyer maintenant
                    </button>
                  )}
                  <button onClick={() => { setEditing(c); setShowForm(true); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-sm border border-border hover:border-primary">
                    Modifier
                  </button>
                  <button onClick={() => dup.mutate(c.id)} className="px-3 py-1.5 text-xs font-semibold rounded-sm border border-border hover:border-primary">
                    Dupliquer
                  </button>
                  <button onClick={() => { if (confirm("Supprimer cette campagne ?")) del.mutate(c.id); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-sm border border-border text-primary hover:bg-primary hover:text-primary-foreground">
                    Supprimer
                  </button>
                </div>
              </div>
              {trackingId === c.id && <MessagesTable rows={messages} loading={messagesLoading} />}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function MessagesTable({ rows, loading }: { rows: any[]; loading: boolean }) {
  return (
    <div className="mt-4 border-t border-border pt-4 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <h3 className="text-xs font-mono uppercase text-foreground/60">Statuts de livraison en temps réel</h3>
      </div>
      <table className="w-full min-w-[620px] text-xs">
        <thead className="bg-muted"><tr><th className="p-2 text-left">Destinataire</th><th className="p-2 text-left">Statut</th><th className="p-2 text-left">Envoyé</th><th className="p-2 text-left">Livré</th><th className="p-2 text-left">Erreur</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={5} className="p-4 text-center text-foreground/50">Chargement…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-foreground/50">Aucun message enregistré.</td></tr>}
          {rows.map((message) => <tr key={message.id} className="border-t border-border"><td className="p-2 font-mono">{message.phone}</td><td className="p-2"><StatusChip status={message.status} /></td><td className="p-2">{message.sent_at ? new Date(message.sent_at).toLocaleString("fr-FR") : "—"}</td><td className="p-2">{message.delivered_at ? new Date(message.delivered_at).toLocaleString("fr-FR") : "—"}</td><td className="p-2 text-destructive">{message.error || "—"}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function labelFor(t: Tab) {
  return ({ all: "Toutes", draft: "Brouillons", scheduled: "Planifiées", recurring: "Récurrentes", sent: "Envoyées", history: "Historique" })[t];
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    recurring: "bg-purple-100 text-purple-700",
    sending: "bg-yellow-100 text-yellow-800",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function ExecutionsTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-background border border-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase font-mono">
          <tr>
            <th className="p-3 text-left">Campagne</th>
            <th className="p-3 text-left">Exécutée</th>
            <th className="p-3">Envoyés</th>
            <th className="p-3">Livrés</th>
            <th className="p-3">Échecs</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-foreground/50">Aucune exécution.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 font-semibold">{r.campaigns?.name ?? "—"}</td>
              <td className="p-3 font-mono text-xs">{new Date(r.run_at).toLocaleString("fr-FR")}</td>
              <td className="p-3 text-center font-mono">{r.sent_count}</td>
              <td className="p-3 text-center font-mono">{r.delivered_count}</td>
              <td className="p-3 text-center font-mono">{r.failed_count}</td>
              <td className="p-3 text-center"><StatusChip status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignForm({ initial, onDone, onCancel }: { initial: any | null; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sender, setSender] = useState(initial?.sender_id ?? "SMSPRO");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [recipients, setRecipients] = useState(
    initial ? (initial.recipients as string[]).join("\n") : ""
  );
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduled_at ? new Date(initial.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [recurrence, setRecurrence] = useState<string>(initial?.recurrence ?? "");
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    initial?.recurrence_end ? new Date(initial.recurrence_end).toISOString().slice(0, 10) : ""
  );

  function build(save_as_draft: boolean) {
    const list = recipients.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return {
      id: initial?.id,
      name,
      sender_id: sender,
      message,
      recipients: list,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      recurrence: recurrence ? (recurrence as "daily" | "weekly" | "monthly") : null,
      recurrence_end: recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null,
      save_as_draft,
    };
  }

  const save = useMutation({
    mutationFn: (asDraft: boolean) => upsertCampaign({ data: build(asDraft) }),
    onSuccess: (_r, asDraft) => {
      toast.success(asDraft ? "Brouillon enregistré" : "Campagne planifiée");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["sms-templates"], queryFn: () => listTemplates(),
  });
  const saveTemplate = useMutation({
    mutationFn: () => upsertTemplate({ data: { name: name || "Modèle sans titre", category: "général", content: message } }),
    onSuccess: () => { toast.success("Modèle enregistré"); void refetchTemplates(); },
    onError: (e: any) => toast.error(e.message),
  });

  const charCount = message.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="bg-background border border-border rounded-sm p-5 mb-4">
      <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
        {initial ? "Modifier la campagne" : "Nouvelle campagne"}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la campagne" className="px-3 py-2 border border-border rounded-sm text-sm sm:col-span-2" />
        <input required value={sender} onChange={(e) => setSender(e.target.value)} maxLength={11} placeholder="Expéditeur (max 11 car.)" className="px-3 py-2 border border-border rounded-sm text-sm font-mono" />
        <div className="text-xs text-foreground/50 self-center">Fuseau: Africa/Abidjan · {smsCount} SMS × destinataires</div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              const t = (templates as any[]).find((x) => x.id === e.target.value);
              if (t) setMessage(t.content);
            }}
            className="px-3 py-2 border border-border rounded-sm text-sm bg-background"
          >
            <option value="">Utiliser un modèle…</option>
            {(templates as any[]).map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.category}</option>
            ))}
          </select>
          <button type="button" disabled={!message || saveTemplate.isPending} onClick={() => saveTemplate.mutate()}
            className="px-3 py-2 text-xs border border-border rounded-sm hover:border-primary disabled:opacity-40">
            Enregistrer ce message comme modèle
          </button>
        </div>
        <textarea required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} placeholder="Message SMS" className="px-3 py-2 border border-border rounded-sm text-sm sm:col-span-2" />
        <div className="text-xs text-foreground/50 sm:col-span-2 text-right font-mono">{charCount}/1000 caractères</div>
        <textarea required value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={4} placeholder="Numéros (un par ligne, ou séparés par virgule)" className="px-3 py-2 border border-border rounded-sm text-sm font-mono sm:col-span-2" />

        <label className="text-xs">
          <span className="font-semibold uppercase text-[10px] font-mono text-foreground/60">Planification</span>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-sm text-sm" />
        </label>
        <label className="text-xs">
          <span className="font-semibold uppercase text-[10px] font-mono text-foreground/60">Récurrence</span>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-sm text-sm bg-background">
            <option value="">Aucune (envoi unique)</option>
            <option value="daily">Quotidienne</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuelle</option>
          </select>
        </label>
        {recurrence && (
          <label className="text-xs sm:col-span-2">
            <span className="font-semibold uppercase text-[10px] font-mono text-foreground/60">Fin de récurrence (optionnel)</span>
            <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-sm text-sm" />
          </label>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-4 flex-wrap">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        <button type="button" disabled={save.isPending} onClick={() => save.mutate(true)} className="px-4 py-2 text-sm border border-border rounded-sm font-semibold hover:border-primary">
          Enregistrer brouillon
        </button>
        <button type="button" disabled={save.isPending} onClick={() => save.mutate(false)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
          {save.isPending ? "…" : scheduledAt || recurrence ? "Planifier" : "Créer et envoyer"}
        </button>
      </div>
    </div>
  );
}
