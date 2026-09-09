import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { listAdminOverview } from "@/lib/admin.functions";
import { fetchRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function AdminPage() {
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => listAdminOverview() });
  return (
    <DashboardLayout title="Supervision Admin">
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Card label="Comptes" value={String(data?.usersCount ?? "…")} />
        <Card label="Commandes payées" value={String(data?.paidOrders ?? "…")} />
        <Card label="CA (FCFA)" value={data ? data.revenue.toLocaleString("fr-FR") : "…"} accent />
        <Card label="Campagnes" value={String(data?.campaignsCount ?? "…")} />
      </div>

      <h2 className="font-display font-bold text-lg mb-3">Dernières commandes</h2>
      <div className="bg-background border border-border rounded-sm overflow-hidden mb-8">
        {(data?.recentOrders ?? []).map((o: any) => (
          <div key={o.id} className="p-4 border-b border-border last:border-b-0 flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold">{o.profiles?.email ?? "—"}</div>
              <div className="text-xs text-foreground/50">{new Date(o.created_at).toLocaleString("fr-FR")} · {o.provider}</div>
            </div>
            <div className="text-right">
              <div className="font-mono">{o.amount_fcfa.toLocaleString("fr-FR")} FCFA</div>
              <span className="text-[10px] font-mono uppercase text-foreground/50">{o.status}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold text-lg mb-3">Dernières campagnes</h2>
      <div className="bg-background border border-border rounded-sm overflow-hidden">
        {(data?.recentCampaigns ?? []).map((c: any) => (
          <div key={c.id} className="p-4 border-b border-border last:border-b-0 text-sm">
            <div className="flex justify-between">
              <div className="font-semibold">{c.name}</div>
              <span className="text-[10px] font-mono uppercase text-foreground/50">{c.status}</span>
            </div>
            <div className="text-xs text-foreground/50 mt-1">
              {c.profiles?.email ?? "—"} · {c.sent_count}/{(c.recipients as string[])?.length ?? 0} envoyés · {c.delivered_count} livrés
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-sm border ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
      <div className={`text-[10px] font-mono uppercase tracking-widest ${accent ? "opacity-70" : "text-foreground/50"}`}>{label}</div>
      <div className="font-display font-extrabold text-3xl mt-1">{value}</div>
    </div>
  );
}
