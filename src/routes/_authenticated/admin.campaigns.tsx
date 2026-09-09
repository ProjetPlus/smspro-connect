import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { AdminToolbar } from "@/components/admin-toolbar";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listCampaignsAdmin, deleteCampaign } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
    status: typeof search['status'] === "string" ? (search['status'] as string) : "all",
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: CampaignsAdmin,
  head: () => ({ meta: [{ title: "Admin · Campagnes" }, { name: "robots", content: "noindex" }] }),
});

function CampaignsAdmin() {
  const qc = useQueryClient();
  const { q, status, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });

  const { data: campaigns = [] } = useQuery({ queryKey: ["admin-campaigns"], queryFn: () => listCampaignsAdmin() });
  const rows = status === "all" ? campaigns : campaigns.filter((c: any) => c.status === status);
  const del = useMutation({
    mutationFn: (id: string) => deleteCampaign({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); toast.success("Supprimée"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DashboardLayout title="Toutes les campagnes">
      <AdminToolbar
        title="Campagnes"
        rows={rows}
        search={q}
        onSearchChange={(v) => setSearch({ q: v, page: 1 })}
        page={page}
        onPageChange={(p) => setSearch({ page: p })}
        filters={
          <select
            value={status}
            onChange={(e) => setSearch({ status: e.target.value, page: 1 })}
            className="text-sm px-3 py-2 border border-border rounded-sm bg-background"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="scheduled">Planifiée</option>
            <option value="recurring">Récurrente</option>
            <option value="sending">En cours</option>
            <option value="sent">Envoyée</option>
            <option value="failed">Échouée</option>
          </select>
        }
        mapRow={(c: any) => ({
          date: c.created_at,
          nom: c.name,
          client: c.profiles?.email,
          expediteur: c.sender_id,
          destinataires: (c.recipients as string[])?.length ?? 0,
          envoyes: c.sent_count,
          livres: c.delivered_count,
          statut: c.status,
          message: c.message,
        })}
        searchKeys={["name", "sender_id", "status", "message"]}
      >

        {({ rows }) => (
          <div className="bg-background border border-border rounded-sm">
            {rows.map((c: any) => (
              <div key={c.id} className="p-4 border-b border-border last:border-b-0">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-foreground/50 mt-1">
                      {c.profiles?.email} · De <span className="font-mono">{c.sender_id}</span> · {(c.recipients as string[])?.length ?? 0} destinataires · {new Date(c.created_at).toLocaleString("fr-FR")}
                    </div>
                    <div className="text-sm text-foreground/70 mt-2 line-clamp-2">{c.message}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs">✓ {c.delivered_count}/{c.sent_count}</div>
                    <span className="text-[10px] font-mono uppercase text-foreground/50">{c.status}</span>
                    <div className="mt-2">
                      <button onClick={() => confirm("Supprimer ?") && del.mutate(c.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="p-6 text-sm text-center text-foreground/50">Aucune campagne.</div>}
          </div>
        )}
      </AdminToolbar>
    </DashboardLayout>
  );
}
