import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { listOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search['status'] === "string" ? (search['status'] as string) : "all",
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
  }),
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Commandes — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function OrdersPage() {
  const { status, q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });

  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => listOrders() });
  const needle = q.trim().toLowerCase();
  const rows = (orders as any[]).filter((o) =>
    (status === "all" || o.status === status) &&
    (!needle ||
      [o.packages?.name, o.provider, o.status].some((v: string) => (v ?? "").toLowerCase().includes(needle))));

  return (
    <DashboardLayout title="Mes commandes">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setSearch({ q: e.target.value })}
          placeholder="Rechercher…"
          className="text-sm px-3 py-2 border border-border rounded-sm bg-background min-w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => setSearch({ status: e.target.value })}
          className="text-sm px-3 py-2 border border-border rounded-sm bg-background"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <span className="text-xs font-mono text-foreground/60">{rows.length} résultat(s)</span>
      </div>
      <div className="bg-background border border-border rounded-sm overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-center text-foreground/50">Chargement…</div>}
        {!isLoading && rows.length === 0 && <div className="p-6 text-sm text-center text-foreground/50">Aucune commande.</div>}
        {rows.map((o: any) => (
          <div key={o.id} className="p-4 border-b border-border last:border-b-0 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">{o.packages?.name ?? "—"} · <span className="text-foreground/60 font-normal">{o.sms_volume} SMS</span></div>
              <div className="text-xs text-foreground/50 mt-1">{new Date(o.created_at).toLocaleString("fr-FR")} · {o.provider ?? "—"}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">{o.amount_fcfa.toLocaleString("fr-FR")} FCFA</div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                o.status === "paid" ? "bg-green-100 text-green-800" :
                o.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
