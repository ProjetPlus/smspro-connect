import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listAllNews, upsertNews, deleteNews } from "@/lib/news-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/news")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: NewsAdmin,
  head: () => ({
    meta: [{ title: "Admin · Actualités" }, { name: "robots", content: "noindex" }],
  }),
});

const empty = {
  id: undefined as string | undefined,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "" as string | null | "",
  status: "draft" as "draft" | "published",
  published_at: "" as string | null | "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function NewsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data } = useQuery({
    queryKey: ["admin-news", search, status, page],
    queryFn: () => listAllNews({ data: { search, status, page, pageSize } }),
  });
  const items: any[] = (data as any)?.items ?? [];
  const total: number = (data as any)?.total ?? 0;
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["admin-news"] });


  const save = useMutation({
    mutationFn: (v: any) =>
      upsertNews({
        data: {
          ...v,
          excerpt: v.excerpt || null,
          cover_image_url: v.cover_image_url || null,
          published_at: v.published_at || null,
        },
      }),
    onSuccess: () => {
      toast.success("Actualité enregistrée");
      inv();
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteNews({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimé");
      inv();
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image > 5 Mo");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("news-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      // signed URL for ~10 years (private bucket)
      const { data: signed, error: sErr } = await supabase.storage
        .from("news-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("URL signée impossible");
      setForm((f) => ({ ...f, cover_image_url: signed.signedUrl }));
      toast.success("Image téléchargée");
    } catch (err: any) {
      toast.error(err.message ?? "Upload échoué");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <DashboardLayout title="Actualités (CMS)">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="bg-background border border-border rounded-sm p-5 space-y-3 h-fit"
        >
          <div className="font-semibold">{form.id ? "Modifier l'article" : "Nouvel article"}</div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
              Titre
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: f.id ? f.slug : slugify(title),
                }));
              }}
              className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
              Slug (URL)
            </label>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
              Résumé (chapo)
            </label>
            <textarea
              value={form.excerpt || ""}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={2}
              className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
              Image de couverture (upload disque)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="w-full mt-1 text-sm"
            />
            {uploading && <div className="text-xs text-foreground/60 mt-1">Envoi en cours...</div>}
            {form.cover_image_url && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={form.cover_image_url}
                  alt="Aperçu"
                  className="h-16 w-24 object-cover rounded-sm border border-border"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                  className="text-xs text-red-600 hover:underline"
                >
                  Retirer
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
              Contenu (Markdown/HTML basique)
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={10}
              className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
                Statut
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))
                }
                className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-foreground/60">
                Date de publication
              </label>
              <input
                type="datetime-local"
                value={form.published_at ? form.published_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    published_at: e.target.value ? new Date(e.target.value).toISOString() : "",
                  }))
                }
                className="w-full mt-1 border border-border rounded-sm px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-sm font-semibold text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {form.id ? "Enregistrer" : "Créer"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(empty)}
                className="border border-border px-4 py-2 rounded-sm font-semibold text-sm hover:bg-muted"
              >
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* List */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Recherche titre/slug…" className="flex-1 min-w-[180px] border border-border rounded-sm px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="border border-border rounded-sm px-2 py-2 text-sm">
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
          <div className="text-sm text-foreground/60">{total} article(s) — page {page}/{Math.max(1, Math.ceil(total / pageSize))}</div>

          {items.map((n: any) => (
            <div key={n.id} className="bg-background border border-border rounded-sm p-4">
              <div className="flex gap-3">
                {n.cover_image_url && (
                  <img
                    src={n.cover_image_url}
                    alt=""
                    className="h-20 w-28 object-cover rounded-sm border border-border shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold truncate">{n.title}</div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                        n.status === "published"
                          ? "bg-success/20 text-success"
                          : "bg-muted text-foreground/60"
                      }`}
                    >
                      {n.status}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/60 font-mono mt-0.5">/{n.slug}</div>
                  {n.excerpt && (
                    <div className="text-sm text-foreground/70 mt-1 line-clamp-2">{n.excerpt}</div>
                  )}
                  <div className="mt-2 flex gap-3 text-xs">
                    <button
                      onClick={() =>
                        setForm({
                          id: n.id,
                          title: n.title,
                          slug: n.slug,
                          excerpt: n.excerpt ?? "",
                          content: n.content ?? "",
                          cover_image_url: n.cover_image_url ?? "",
                          status: n.status,
                          published_at: n.published_at ?? "",
                        })
                      }
                      className="text-primary hover:underline font-semibold"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => confirm("Supprimer ?") && del.mutate(n.id)}
                      className="text-red-600 hover:underline font-semibold"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-6 text-sm text-center text-foreground/50 border border-dashed border-border rounded-sm">
              Aucune actualité.
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="text-xs border border-border rounded-sm px-3 py-1.5 disabled:opacity-40">← Préc.</button>
            <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="text-xs border border-border rounded-sm px-3 py-1.5 disabled:opacity-40">Suiv. →</button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
