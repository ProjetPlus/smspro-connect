import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listPackagesAdmin, upsertPackage, deletePackage } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Field } from "@/components/field";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: PackagesAdmin,
  head: () => ({ meta: [{ title: "Admin · Packages" }, { name: "robots", content: "noindex" }] }),
});

function empty() {
  return { slug: "", name: "", price_fcfa: 0, sms_volume: 0, features: [] as string[], active: true, featured: false };
}

function PackagesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data: packages = [] } = useQuery({ queryKey: ["admin-packages"], queryFn: () => listPackagesAdmin() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-packages"] });
  const del = useMutation({
    mutationFn: (id: string) => deletePackage({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Supprimé"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Packages SMS">
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing(empty())} className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark">+ Nouveau package</button>
      </div>

      {editing && <PackageForm pkg={editing} onDone={() => { setEditing(null); invalidate(); }} onCancel={() => setEditing(null)} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {packages.map((p: any) => (
          <div key={p.id} className="bg-background border border-border rounded-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{p.slug} {p.featured && "· ★"} {!p.active && "· inactif"}</div>
                <div className="font-display font-bold text-lg">{p.name}</div>
                <div className="font-mono text-xl mt-1">{p.price_fcfa.toLocaleString("fr-FR")} FCFA</div>
                <div className="text-xs text-foreground/60">{p.sms_volume.toLocaleString("fr-FR")} SMS</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(p)} className="text-xs underline">Éditer</button>
                <button onClick={() => confirm(`Supprimer ${p.name} ?`) && del.mutate(p.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
              </div>
            </div>
            <ul className="text-xs mt-3 space-y-0.5">
              {(p.features as string[]).map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

function PackageForm({ pkg, onDone, onCancel }: { pkg: any; onDone: () => void; onCancel: () => void }) {
  const [s, setS] = useState({ ...pkg, features: (pkg.features ?? []).join("\n") });
  const save = useMutation({
    mutationFn: () => upsertPackage({
      data: {
        id: pkg.id, slug: s.slug, name: s.name,
        price_fcfa: Number(s.price_fcfa), sms_volume: Number(s.sms_volume),
        features: String(s.features).split(/\n/).map((x: string) => x.trim()).filter(Boolean),
        is_active: !!s.active, featured: !!s.featured,
      },
    }),
    onSuccess: () => { toast.success("Enregistré"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="bg-background border border-primary rounded-sm p-5 mb-4 grid gap-3 sm:grid-cols-2">
      <Field label="Identifiant (slug)" hint="minuscules, sans espace">
        <input required value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value })} placeholder="pack-1000" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field label="Nom du package">
        <input required value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Pack 1 000 SMS" className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
      </Field>
      <Field label="Prix total (FCFA)">
        <input required type="number" min={0} value={s.price_fcfa} onChange={(e) => setS({ ...s, price_fcfa: e.target.value })} placeholder="20000" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field label="Volume SMS inclus">
        <input required type="number" min={0} value={s.sms_volume} onChange={(e) => setS({ ...s, sms_volume: e.target.value })} placeholder="1000" className="w-full px-3 py-2 border border-border rounded-sm text-sm font-mono" />
      </Field>
      <Field className="sm:col-span-2" label="Fonctionnalités" hint="une par ligne">
        <textarea rows={4} value={s.features} onChange={(e) => setS({ ...s, features: e.target.value })} placeholder={"Envoi illimité\nAPI incluse"} className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />Actif (visible sur le site)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.featured} onChange={(e) => setS({ ...s, featured: e.target.checked })} />Mis en avant</label>

      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        <button type="submit" disabled={save.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">Enregistrer</button>
      </div>
    </form>
  );
}
