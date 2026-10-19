import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: AuditPage,
  head: () => ({ meta: [{ title: "Journal d’audit — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function AuditPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => listAuditLogs(),
    refetchInterval: 60000,
  });
  const rows = useMemo(() => data.filter((item: any) =>
    (filter === "all" || item.resource === filter) &&
    [item.action, item.resource, item.resource_id, item.actor_id, ...(item.changed_fields ?? [])]
      .some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  ), [data, filter, search]);
  const resources = [...new Set(data.map((item: any) => item.resource))].sort();
  return <DashboardLayout title="Journal d’audit">
    <div className="grid gap-3 sm:grid-cols-3 mb-5">
      <Stat label="Événements chargés" value={data.length} />
      <Stat label="Ressources concernées" value={resources.length} />
      <Stat label="Dernière activité" value={data[0]?.created_at ? new Date(data[0].created_at).toLocaleString("fr-FR") : "—"} />
    </div>
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une action, ressource ou identifiant…" className="flex-1 border border-border bg-background px-3 py-2 rounded-sm text-sm" />
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-border bg-background px-3 py-2 rounded-sm text-sm">
        <option value="all">Toutes les ressources</option>
        {resources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}
      </select>
      <button onClick={() => void refetch()} disabled={isFetching} className="border border-border px-3 py-2 rounded-sm text-sm">{isFetching ? "Actualisation…" : "Actualiser"}</button>
    </div>
    {isError && <div role="alert" className="border border-destructive/40 p-4 bg-background text-sm">Impossible de charger le journal : {(error as Error).message}. Vérifiez que la migration d’audit est appliquée.</div>}
    <div className="border border-border bg-background rounded-sm overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted text-[10px] uppercase tracking-wider"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Action</th><th className="text-left p-3">Ressource</th><th className="text-left p-3">Identifiant</th><th className="text-left p-3">Champs modifiés</th><th className="text-left p-3">Acteur</th></tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>}
          {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun événement correspondant.</td></tr>}
          {rows.map((item: any) => <tr key={item.id} className="border-t border-border align-top">
            <td className="p-3 whitespace-nowrap text-xs">{new Date(item.created_at).toLocaleString("fr-FR")}</td>
            <td className="p-3"><span className="inline-block rounded-sm bg-muted px-2 py-1 text-xs font-semibold">{item.action}</span></td>
            <td className="p-3">{item.resource}</td>
            <td className="p-3 font-mono text-xs max-w-48 truncate" title={item.resource_id ?? ""}>{item.resource_id ?? "—"}</td>
            <td className="p-3 text-xs">{(item.changed_fields ?? []).join(", ") || "—"}</td>
            <td className="p-3 font-mono text-xs max-w-40 truncate" title={item.actor_id ?? ""}>{item.actor_id ?? "Système"}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Le journal conserve les actions et les noms des champs modifiés, sans recopier le contenu des messages ni les valeurs personnelles.</p>
  </DashboardLayout>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-border bg-background rounded-sm p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-bold text-xl break-words">{value}</div></div>;
}
