import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { AdminToolbar } from "@/components/admin-toolbar";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listOrdersAdmin, updateOrderStatus } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
    status: typeof search['status'] === "string" ? (search['status'] as string) : "all",
    provider: typeof search['provider'] === "string" ? (search['provider'] as string) : "all",
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: OrdersAdmin,
  head: () => ({ meta: [{ title: "Admin · Commandes" }, { name: "robots", content: "noindex" }] }),
});

function OrdersAdmin() {
  const qc = useQueryClient();
  const { q, status, provider, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });

  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => listOrdersAdmin() });
  const rows = orders.filter((o: any) =>
    (status === "all" || o.status === status) &&
    (provider === "all" || (o.provider ?? "") === provider));
  const upd = useMutation({
    mutationFn: (v: { id: string; status: any }) => updateOrderStatus({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Statut mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DashboardLayout title="Toutes les commandes">
      <AdminToolbar
        title="Commandes"
        rows={rows}
        search={q}
        onSearchChange={(v) => setSearch({ q: v, page: 1 })}
        page={page}
        onPageChange={(p) => setSearch({ page: p })}
        filters={
          <>
            <select value={status} onChange={(e) => setSearch({ status: e.target.value, page: 1 })}
              className="text-sm px-3 py-2 border border-border rounded-sm bg-background">
              <option value="all">Tous les statuts</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>
            <select value={provider} onChange={(e) => setSearch({ provider: e.target.value, page: 1 })}
              className="text-sm px-3 py-2 border border-border rounded-sm bg-background">
              <option value="all">Tous les providers</option>
              <option value="cinetpay">cinetpay</option>
              <option value="fedapay">fedapay</option>
            </select>
          </>
        }
        mapRow={(o: any) => ({
          date: o.created_at,
          client: o.profiles?.email,
          package: o.packages?.name ?? "",
          montant_fcfa: o.amount_fcfa,
          provider: o.provider ?? "",
          statut: o.status,
        })}
        searchKeys={["status", "provider"]}
      >

        {({ rows }) => (
          <div className="bg-background border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted text-left text-xs uppercase font-mono">
                <tr><th className="p-3">Date</th><th className="p-3">Client</th><th className="p-3">Package</th><th className="p-3">Montant</th><th className="p-3">Provider</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody>
                {rows.map((o: any) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 text-xs">{new Date(o.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-xs">{o.profiles?.email}</td>
                    <td className="p-3">{o.packages?.name ?? "—"}</td>
                    <td className="p-3 font-mono">{o.amount_fcfa.toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-xs uppercase">{o.provider ?? "—"}</td>
                    <td className="p-3">
                      <select value={o.status} onChange={(e) => upd.mutate({ id: o.id, status: e.target.value })} className="text-xs border border-border rounded-sm px-2 py-1">
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="failed">failed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminToolbar>
    </DashboardLayout>
  );
}
