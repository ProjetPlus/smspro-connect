import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listHeroSlides, upsertHeroSlide, deleteHeroSlide, reorderHeroSlides } from "@/lib/hero-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/hero")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: HeroAdmin,
  head: () => ({ meta: [{ title: "Admin · Carousel Hero" }, { name: "robots", content: "noindex" }] }),
});

const empty = {
  id: undefined as string | undefined,
  media_url: "",
  eyebrow: "",
  title: "",
  subtitle: "",
  href: "",
  cta: "",
  kind: "other" as "sms" | "email" | "uemoa" | "news" | "money" | "other",
  position: 0,
  duration_ms: 5000,
  pause_on_hover: true,
  is_active: true,
};

function HeroAdmin() {
  const qc = useQueryClient();
  const { data: slides = [] } = useQuery({ queryKey: ["admin-hero"], queryFn: () => listHeroSlides() });
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["admin-hero"] });

  const save = useMutation({
    mutationFn: (v: any) => upsertHeroSlide({
      data: {
        ...v,
        subtitle: v.subtitle || null,
        href: v.href || null,
        cta: v.cta || null,
        eyebrow: v.eyebrow || "",
      },
    }),
    onSuccess: () => { toast.success("Slide enregistrée"); inv(); setForm(empty); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteHeroSlide({ data: { id } }),
    onSuccess: () => { toast.success("Supprimée"); inv(); },
  });
  const move = useMutation({
    mutationFn: (order: { id: string; position: number }[]) => reorderHeroSlides({ data: { order } }),
    onSuccess: inv,
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image > 5 Mo"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("news-media").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("news-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("URL signée impossible");
      setForm((f) => ({ ...f, media_url: signed.signedUrl }));
      toast.success("Image téléchargée");
    } catch (err: any) {
      toast.error(err.message ?? "Upload échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function moveBy(id: string, delta: number) {
    const sorted = [...slides].sort((a: any, b: any) => a.position - b.position);
    const idx = sorted.findIndex((s: any) => s.id === id);
    if (idx < 0) return;
    const nb = idx + delta;
    if (nb < 0 || nb >= sorted.length) return;
    const swapped = sorted.slice();
    [swapped[idx], swapped[nb]] = [swapped[nb], swapped[idx]];
    move.mutate(swapped.map((s: any, i) => ({ id: s.id, position: i })));
  }

  return (
    <DashboardLayout title="Carousel Hero">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-background border border-border rounded-sm p-5 space-y-3 h-fit">
          <div className="font-semibold">{form.id ? "Modifier la slide" : "Nouvelle slide"}</div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Image (upload disque)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="w-full mt-1 text-sm" />
            {uploading && <div className="text-xs text-foreground/60 mt-1">Envoi en cours...</div>}
            {form.media_url && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.media_url} alt="Aperçu" className="h-20 w-32 object-cover rounded-sm border border-border" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, media_url: "" }))} className="text-xs text-red-600 hover:underline">Retirer</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Type</label>
              <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm">
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="uemoa">UEMOA</option>
                <option value="news">Actualité</option>
                <option value="money">Mobile Money</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Position</label>
              <input type="number" min={0} value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) || 0 }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Accroche (eyebrow)</label>
            <input value={form.eyebrow} onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Titre</label>
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Sous-titre</label>
            <textarea value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} rows={2} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Lien (href)</label>
              <input value={form.href} onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))} placeholder="/solutions ou https://..." className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Texte bouton</label>
              <input value={form.cta} onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">Durée (ms)</label>
              <input type="number" min={1500} step={500} value={form.duration_ms} onChange={(e) => setForm((f) => ({ ...f, duration_ms: Number(e.target.value) || 5000 }))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={form.pause_on_hover} onChange={(e) => setForm((f) => ({ ...f, pause_on_hover: e.target.checked }))} /> Pause au survol
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Actif (public)
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={save.isPending || !form.media_url} className="bg-primary text-primary-foreground px-4 py-2 rounded-sm font-semibold text-sm hover:bg-primary-dark disabled:opacity-50">
              {form.id ? "Enregistrer" : "Créer"}
            </button>
            {form.id && <button type="button" onClick={() => setForm(empty)} className="border border-border px-4 py-2 rounded-sm font-semibold text-sm hover:bg-muted">Annuler</button>}
          </div>
        </form>

        <div className="space-y-3">
          <div className="text-sm text-foreground/60">{slides.length} slide(s)</div>
          {[...slides].sort((a: any, b: any) => a.position - b.position).map((s: any) => (
            <div key={s.id} className="bg-background border border-border rounded-sm p-4">
              <div className="flex gap-3">
                <img src={s.media_url} alt="" className="h-20 w-28 object-cover rounded-sm border border-border shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold truncate">{s.title}</div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${s.is_active ? "bg-success/20 text-success" : "bg-muted text-foreground/60"}`}>
                      {s.is_active ? "actif" : "inactif"}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/60 mt-0.5">#{s.position} · {s.kind} · {s.duration_ms}ms {s.pause_on_hover ? "· pause au survol" : ""}</div>
                  {s.subtitle && <div className="text-sm text-foreground/70 mt-1 line-clamp-2">{s.subtitle}</div>}
                  <div className="mt-2 flex gap-3 text-xs">
                    <button onClick={() => moveBy(s.id, -1)} className="hover:underline">↑ Monter</button>
                    <button onClick={() => moveBy(s.id, +1)} className="hover:underline">↓ Descendre</button>
                    <button onClick={() => setForm({ ...empty, ...s, subtitle: s.subtitle ?? "", href: s.href ?? "", cta: s.cta ?? "" })} className="text-primary hover:underline font-semibold">Modifier</button>
                    <button onClick={() => confirm("Supprimer ?") && del.mutate(s.id)} className="text-red-600 hover:underline font-semibold">Supprimer</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 && <div className="p-6 text-sm text-center text-foreground/50 border border-dashed border-border rounded-sm">Aucune slide. Créez la première.</div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
