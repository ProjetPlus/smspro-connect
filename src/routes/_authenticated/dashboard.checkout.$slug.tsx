import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { getPackageBySlug } from "@/lib/packages.functions";
import { initiatePayment } from "@/lib/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/checkout/$slug")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Paiement — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function CheckoutPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<"cinetpay" | "fedapay">("cinetpay");

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["package", slug],
    queryFn: () => getPackageBySlug({ data: { slug } }),
  });

  const pay = useMutation({
    mutationFn: () => initiatePayment({ data: { package_slug: slug, provider } }),
    onSuccess: (r: any) => {
      if (r.session?.mock) {
        toast.success("Mode simulation : commande confirmée et crédits ajoutés.");
        navigate({ to: "/dashboard/orders", search: { status: "all", q: "" } });
      } else if (r.session?.payment_url) {
        window.location.href = r.session.payment_url;
      } else if (!r.session?.configured) {
        toast.error(r.session?.message ?? "Paiement non configuré");
        navigate({ to: "/dashboard/orders", search: { status: "all", q: "" } });
      } else {
        toast.error(r.session?.message ?? "Erreur d'initialisation");
      }
    },

    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <DashboardLayout title="Paiement"><div className="text-sm">Chargement…</div></DashboardLayout>;
  if (!pkg) return <DashboardLayout title="Package introuvable"><div className="text-sm">Ce package n'existe pas.</div></DashboardLayout>;

  return (
    <DashboardLayout title={`Payer le package ${pkg.name}`}>
      <div className="max-w-xl">
        <div className="bg-background border border-border rounded-sm p-6 mb-4">
          <div className="text-xs font-mono uppercase tracking-widest text-primary mb-2">{pkg.name}</div>
          <div className="font-display text-4xl font-extrabold mb-1">{pkg.price_fcfa.toLocaleString("fr-FR")} FCFA</div>
          <div className="text-sm text-foreground/60 mb-4">{pkg.sms_volume.toLocaleString("fr-FR")} SMS</div>
          <ul className="text-sm space-y-1.5">
            {(pkg.features as string[]).map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        </div>

        <div className="bg-background border border-border rounded-sm p-6 mb-4">
          <h2 className="font-display font-bold mb-3">Moyen de paiement</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["cinetpay", "fedapay"] as const).map((p) => (
              <label key={p} className={`p-4 border rounded-sm cursor-pointer ${provider === p ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="provider" checked={provider === p} onChange={() => setProvider(p)} className="mr-2" />
                <span className="font-semibold uppercase text-sm">{p}</span>
                <div className="text-xs text-foreground/60 mt-1">Mobile Money (MTN, Orange, Wave)</div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={() => pay.mutate()} disabled={pay.isPending} className="w-full bg-primary text-primary-foreground py-3 rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
          {pay.isPending ? "Préparation…" : `Payer ${pkg.price_fcfa.toLocaleString("fr-FR")} FCFA`}
        </button>
        <p className="text-xs text-foreground/50 mt-3 text-center">
          Vous serez redirigé vers la page sécurisée du fournisseur. Vos crédits SMS seront ajoutés automatiquement après confirmation.
        </p>
      </div>
    </DashboardLayout>
  );
}
