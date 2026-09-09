import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { getCampaignsReport } from "@/lib/campaigns.functions";
import { exportCSV, exportPDF } from "@/lib/export-csv";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Suivi des campagnes — SMS Pro Mobile" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["campaigns-report"], queryFn: () => getCampaignsReport() });
  const [status, setStatus] = useState("all");

  const campaigns = useMemo(() => {
    const rows = data?.campaigns ?? [];
    return status === "all" ? rows : rows.filter((c) => c.status === status);
  }, [data, status]);

  const totals = data?.totals ?? { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 };
  const rate = totals.total ? Math.round((totals.delivered / totals.total) * 100) : 0;
  const maxDay = Math.max(1, ...(data?.byDay ?? []).map((d) => d.count));

  function rowsForExport() {
    return campaigns.map((c) => ({
      campagne: c.name,
      statut: c.status,
      envoyes: c.sent_count,
      livres: c.delivered_count,
      echecs: c.failed_count,
      creee_le: new Date(c.created_at).toLocaleString("fr-FR"),
      prochaine_execution: c.next_run_at ? new Date(c.next_run_at).toLocaleString("fr-FR") : "",
      derniere_execution: c.last_run_at ? new Date(c.last_run_at).toLocaleString("fr-FR") : "",
    }));
  }

  return (
    <DashboardLayout title="Suivi des campagnes">
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Stat label="Messages" value={totals.total} />
        <Stat label="Livrés" value={totals.delivered} accent />
        <Stat label="Échecs" value={totals.failed} />
        <Stat label="Taux de livraison" value={`${rate}%`} />
      </div>

      <section className="bg-background border border-border rounded-sm p-5 mb-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-foreground/50 mb-4">Volume envoyé par jour</h2>
        {(data?.byDay ?? []).length === 0 ? (
          <p className="text-sm text-foreground/50">Aucun envoi enregistré.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {(data?.byDay ?? []).slice(-30).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day} · ${d.count}`}>
                <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                <span className="text-[9px] font-mono text-foreground/40">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-sm text-sm bg-background">
          {["all", "draft", "scheduled", "recurring", "sending", "sent", "failed"].map((s) => (
            <option key={s} value={s}>{s === "all" ? "Tous les statuts" : s}</option>
          ))}
        </select>
        <button onClick={() => exportCSV("campagnes-sms.csv", rowsForExport())}
          className="px-3 py-2 text-sm border border-border rounded-sm hover:border-primary">Exporter CSV</button>
        <button onClick={() => exportPDF("Rapport campagnes SMS", rowsForExport())}
          className="px-3 py-2 text-sm border border-border rounded-sm hover:border-primary">Exporter PDF</button>
      </div>

      <div className="bg-background border border-border rounded-sm overflow-x-auto mb-8">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-[10px] uppercase font-mono">
            <tr>
              <th className="p-3 text-left">Campagne</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3">Envoyés</th>
              <th className="p-3">Livrés</th>
              <th className="p-3">Échecs</th>
              <th className="p-3 text-left">Prochaine exécution</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-foreground/50">Chargement…</td></tr>}
            {!isLoading && campaigns.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-foreground/50">Aucune campagne.</td></tr>}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3"><Chip status={c.status} /></td>
                <td className="p-3 text-center font-mono">{c.sent_count}</td>
                <td className="p-3 text-center font-mono">{c.delivered_count}</td>
                <td className="p-3 text-center font-mono">{c.failed_count}</td>
                <td className="p-3 font-mono text-xs">{c.next_run_at ? new Date(c.next_run_at).toLocaleString("fr-FR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display font-bold text-lg mb-3">Historique des exécutions</h2>
      <div className="bg-background border border-border rounded-sm overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-[10px] uppercase font-mono">
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
            {(data?.executions ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-foreground/50">Aucune exécution.</td></tr>}
            {(data?.executions ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-semibold">{r.campaigns?.name ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{new Date(r.run_at).toLocaleString("fr-FR")}</td>
                <td className="p-3 text-center font-mono">{r.sent_count}</td>
                <td className="p-3 text-center font-mono">{r.delivered_count}</td>
                <td className="p-3 text-center font-mono">{r.failed_count}</td>
                <td className="p-3 text-center"><Chip status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-sm border ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
      <div className={`text-[10px] font-mono uppercase tracking-widest ${accent ? "opacity-70" : "text-foreground/50"}`}>{label}</div>
      <div className="font-display font-extrabold text-3xl mt-1">{value}</div>
    </div>
  );
}

function Chip({ status }: { status: string }) {
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
