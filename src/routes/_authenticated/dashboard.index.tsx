import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { listCampaigns } from "@/lib/campaigns.functions";
import { listOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
  head: () => ({ meta: [{ title: "Espace client — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function DashboardHome() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => listOrders() });

  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count ?? 0), 0);
  const totalDelivered = campaigns.reduce((s, c) => s + (c.delivered_count ?? 0), 0);

  return (
    <DashboardLayout title="Vue d'ensemble">
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card label="Crédits SMS" value={String(profile?.sms_credits ?? 0)} accent />
        <Card label="SMS envoyés" value={String(totalSent)} />
        <Card label="SMS livrés" value={String(totalDelivered)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Link to="/dashboard/campaigns" search={{ q: "", tab: "all" }} className="p-5 bg-background border border-border rounded-sm hover:border-primary transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Action</div>
          <div className="font-display font-bold text-lg mt-1">Nouvelle campagne</div>
          <p className="text-sm text-foreground/60 mt-2">Créez et envoyez une campagne SMS à vos contacts.</p>
        </Link>
        <Link to="/tarifs" className="p-5 bg-primary text-primary-foreground rounded-sm hover:bg-primary-dark transition-colors">
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-70">Recharge</div>
          <div className="font-display font-bold text-lg mt-1">Acheter un package</div>
          <p className="text-sm opacity-80 mt-2">Créditez votre compte via Mobile Money.</p>
        </Link>
      </div>

      <h2 className="font-display font-bold text-lg mb-3">Commandes récentes</h2>
      <div className="bg-background border border-border rounded-sm overflow-hidden">
        {orders.slice(0, 5).map((o: any) => (
          <div key={o.id} className="p-4 border-b border-border last:border-b-0 flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold">{o.packages?.name ?? "—"}</div>
              <div className="text-xs text-foreground/50">{new Date(o.created_at).toLocaleString("fr-FR")}</div>
            </div>
            <div className="text-right">
              <div className="font-mono">{o.amount_fcfa.toLocaleString("fr-FR")} FCFA</div>
              <StatusPill status={o.status} />
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-6 text-sm text-foreground/50 text-center">Aucune commande.</div>}
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
