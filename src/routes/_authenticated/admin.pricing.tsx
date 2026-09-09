import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listPricingTiersAdmin, upsertPricingTier, deletePricingTier } from "@/lib/pricing-admin.functions";
import { formatUnitPrice, tierRangeLabel, findTier, estimateCost, formatFcfa, type PricingTier } from "@/lib/pricing";
import { toast } from "sonner";
import { Field } from "@/components/field";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: PricingAdmin,
  head: () => ({ meta: [{ title: "Admin · Paliers tarifaires" }, { name: "robots", content: "noindex" }] }),
});

type Draft = {
  id?: string;
  label: string;
  min_sms: number | string;
  max_sms: number | string;
  unit_price_fcfa: number | string;
  sort_order: number | string;
  active: boolean;
};

function emptyDraft(sort: number): Draft {
  return { label: "", min_sms: "", max_sms: "", unit_price_fcfa: "", sort_order: sort, active: true };
}

function PricingAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [sim, setSim] = useState("1000");
  const { data: tiers = [] } = useQuery({ queryKey: ["admin-pricing-tiers"], queryFn: () => listPricingTiersAdmin() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-pricing-tiers"] });
    qc.invalidateQueries({ queryKey: ["pricing-tiers"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deletePricingTier({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Palier supprimé"); },
    onError: (e: any) => toast.error(e.message),
  });

  const activeTiers = (tiers as any[]).filter((t) => t.active) as PricingTier[];
  const volume = Number(sim);
  const matched = findTier(activeTiers, volume);
  const total = estimateCost(activeTiers, volume);

  return (
    <DashboardLayout title="Paliers tarifaires">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing(emptyDraft((tiers as any[]).length + 1))}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark"
        >
          + Nouveau palier
        </button>
      </div>

      {editing && (
        <TierForm
          draft={editing}
          onCancel={() => setEditing(null)}
          onDone={() => { setEditing(null); invalidate(); }}
        />
      )}

      <div className="bg-background border border-border rounded-sm p-4 mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">
          Simulateur — vérification du palier
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            value={sim}
            onChange={(e) => setSim(e.target.value)}
            className="w-40 px-3 py-2 border border-border rounded-sm text-sm font-mono"
          />
          <span className="text-sm">SMS →</span>
          <span className="text-sm font-semibold">
            {matched ? `${matched.label} · ${formatUnitPrice(matched.unit_price_fcfa)}` : "aucun palier"}
          </span>
          {total !== null && <span className="text-sm font-mono">= {formatFcfa(total)}</span>}
        </div>
      </div>

      <div className="overflow-x-auto bg-background border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-[10px] font-mono uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-2">Ordre</th>
              <th className="px-3 py-2">Libellé</th>
              <th className="px-3 py-2">Plage</th>
              <th className="px-3 py-2">Prix unitaire</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tiers as any[]).map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{t.sort_order}</td>
                <td className="px-3 py-2 font-semibold">{t.label}</td>
                <td className="px-3 py-2">{tierRangeLabel(t)}</td>
                <td className="px-3 py-2 font-mono">{formatUnitPrice(t.unit_price_fcfa)}</td>
                <td className="px-3 py-2">{t.active ? "Actif" : "Inactif"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing({ ...t, max_sms: t.max_sms ?? "" })}
                    className="text-xs underline mr-3"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => confirm(`Supprimer « ${t.label} » ?`) && del.mutate(t.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/60 mt-3">
        Toute modification est immédiatement propagée aux pages publiques (accueil, tarifs) et au tunnel de commande.
      </p>
    </DashboardLayout>
  );
}

function TierForm({ draft, onDone, onCancel }: { draft: Draft; onDone: () => void; onCancel: () => void }) {
  const [s, setS] = useState<Draft>(draft);
  const save = useMutation({
    mutationFn: () =>
      upsertPricingTier({
        data: {
          ...(s.id ? { id: s.id } : {}),
          label: s.label,
          min_sms: Number(s.min_sms),
          max_sms: s.max_sms === "" ? null : Number(s.max_sms),
          unit_price_fcfa: Number(s.unit_price_fcfa),
          sort_order: Number(s.sort_order),
          active: !!s.active,
        },
      }),
    onSuccess: () => { toast.success("Palier enregistré"); onDone(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="bg-background border border-primary rounded-sm p-5 mb-4 grid gap-3 sm:grid-cols-2"
    >
      <Field className="sm:col-span-2" label="Libellé du palier">
        <input required value={s.label} onChange={(e) => setS({ ...s, label: e.target.value })} placeholder="ex : 1 000 à 9 999 SMS" className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
      </Field>
      <Field label="SMS minimum">
        <input required type="number" min={1} value={s.min_sms} onChange={(e) => setS({ ...s, min_sms: e.target.value })} placeholder="1000" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field label="SMS maximum" hint="Laisser vide = illimité">
        <input type="number" value={s.max_sms} onChange={(e) => setS({ ...s, max_sms: e.target.value })} placeholder="9999" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field label="Prix unitaire (FCFA / SMS)">
        <input required type="number" min={1} value={s.unit_price_fcfa} onChange={(e) => setS({ ...s, unit_price_fcfa: e.target.value })} placeholder="20" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field label="Ordre d'affichage">
        <input required type="number" value={s.sort_order} onChange={(e) => setS({ ...s, sort_order: e.target.value })} placeholder="1" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={!!s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />
        Palier actif (visible sur les pages publiques)
      </label>

      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        <button type="submit" disabled={save.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">Enregistrer</button>
      </div>
    </form>
  );
}
