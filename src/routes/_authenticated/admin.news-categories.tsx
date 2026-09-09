import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listCategoriesAdmin, upsertCategory, deleteCategory, listAllTags } from "@/lib/news-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/news-categories")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: CategoriesAdmin,
  head: () => ({ meta: [{ title: "Admin · Catégories & tags" }, { name: "robots", content: "noindex" }] }),
});

const empty = { id: undefined as string | undefined, name: "", slug: "", description: "" };
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => listCategoriesAdmin() });
  const { data: tags = [] } = useQuery({ queryKey: ["admin-tags"], queryFn: () => listAllTags() });
  const [form, setForm] = useState(empty);

  const save = useMutation({
    mutationFn: (v: any) => upsertCategory({ data: { ...v, description: v.description || null } }),
    onSuccess: () => { toast.success("Catégorie enregistrée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); setForm(empty); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["admin-cats"] }); },
  });

  return (
    <DashboardLayout title="Catégories & tags d'actualités">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-background border border-border rounded-sm p-5 space-y-3 h-fit">
          <div className="font-semibold">{form.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Nom</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Slug</label>
            <input required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={save.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-sm font-semibold text-sm hover:bg-primary-dark disabled:opacity-50">{form.id ? "Enregistrer" : "Créer"}</button>
            {form.id && <button type="button" onClick={() => setForm(empty)} className="border border-border px-4 py-2 rounded-sm font-semibold text-sm hover:bg-muted">Annuler</button>}
          </div>
        </form>

        <div className="space-y-3">
          <div className="text-sm text-foreground/60">{cats.length} catégorie(s)</div>
          {cats.map((c: any) => (
            <div key={c.id} className="bg-background border border-border rounded-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs font-mono text-foreground/60">/actualites/categorie/{c.slug}</div>
                  {c.description && <div className="text-sm text-foreground/70 mt-1">{c.description}</div>}
                </div>
                <div className="flex gap-3 text-xs shrink-0">
                  <button onClick={() => setForm({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "" })} className="text-primary hover:underline font-semibold">Modifier</button>
                  <button onClick={() => confirm("Supprimer ?") && del.mutate(c.id)} className="text-red-600 hover:underline font-semibold">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && <div className="p-6 text-sm text-center text-foreground/50 border border-dashed border-border rounded-sm">Aucune catégorie.</div>}

          <div className="mt-8">
            <div className="text-xs font-mono uppercase tracking-widest text-foreground/60 mb-2">Tags existants ({tags.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t: string) => (
                <span key={t} className="text-xs px-2 py-1 bg-muted rounded-full">#{t}</span>
              ))}
              {tags.length === 0 && <span className="text-sm text-foreground/50">Aucun tag. Ajoutez-les depuis un article.</span>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
