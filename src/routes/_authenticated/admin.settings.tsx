import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Admin · Paramètres système" }, { name: "robots", content: "noindex" }] }),
});

function AdminSettings() {
  return (
    <DashboardLayout title="Paramètres système">
      <div className="mb-6 p-4 rounded-sm border border-success bg-success/10 text-sm">
        <div className="font-display font-bold">Mode production actif</div>
        <p className="text-foreground/60 mt-1">
          Les campagnes utilisent exclusivement la passerelle NM Groupe et les commandes les prestataires Mobile Money configurés. Aucune donnée simulée n'est générée.
        </p>
      </div>
      <div className="bg-background border border-border rounded-sm p-5 text-sm space-y-2">
        <h2 className="font-display font-bold text-lg">Services externes</h2>
        <p>SMS : NM Groupe, statuts de livraison reçus par webhook sécurisé.</p>
        <p>Paiements : CinetPay et FedaPay, confirmation automatique par webhook signé.</p>
        <p className="text-foreground/60">Une configuration absente bloque l'opération au lieu de produire un faux résultat.</p>
      </div>
    </DashboardLayout>
  );
}
