import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { deleteTemplate, listTemplates, upsertTemplate } from "@/lib/templates.functions";

type SmsTemplate = { id: string; name: string; category: string; content: string; created_at?: string; updated_at?: string };
const EMPTY = { name: "", category: "général", content: "" };
const GSM_BASIC = /^[\x00-\x7F€£¥èéùìòÇ\n\rØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà]*$/;

function estimateSms(content: string) {
  if (!content) return { encoding: "GSM-7", chars: 0, segments: 0, limit: 160 };
  const gsm = GSM_BASIC.test(content);
  const units = gsm ? [...content].reduce((n, c) => n + ("^{}\\[~]|€".includes(c) ? 2 : 1), 0) : [...content].length;
  const limit = gsm ? 160 : 70;
  const multipart = gsm ? 153 : 67;
  return { encoding: gsm ? "GSM-7" : "Unicode", chars: units, segments: units <= limit ? 1 : Math.ceil(units / multipart), limit: units <= limit ? limit : multipart };
}

export const Route = createFileRoute("/_authenticated/dashboard/templates")({
  component: TemplatesPage,
  head: () => ({ meta: [{ title: "Modèles SMS — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function TemplatesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; name: string; category: string; content: string }>(EMPTY);
  const [query, setQuery] = useState("");
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: () => listTemplates() as Promise<SmsTemplate[]>,
  });
  const filtered = useMemo(() => data.filter((item) => [item.name, item.category, item.content].some((v) => v.toLowerCase().includes(query.toLowerCase()))), [data, query]);
  const stats = estimateSms(editing.content);
  const save = useMutation({
    mutationFn: () => upsertTemplate({ data: editing }),
    onSuccess: async () => {
      toast.success(editing.id ? "Modèle mis à jour" : "Modèle enregistré");
      setEditing(EMPTY);
      await qc.invalidateQueries({ queryKey: ["sms-templates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Impossible d'enregistrer ce modèle"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate({ data: { id } }),
    onSuccess: async () => { toast.success("Modèle supprimé"); await qc.invalidateQueries({ queryKey: ["sms-templates"] }); },
    onError: (e: Error) => toast.error(e.message || "Suppression impossible"),
  });

  return <DashboardLayout title="Bibliothèque de modèles SMS">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div><p className="text-sm text-muted-foreground">Réutilisez des messages validés, personnalisez-les et préparez vos campagnes plus vite.</p><p className="text-xs text-muted-foreground mt-1">{data.length} modèle{data.length > 1 ? "s" : ""} enregistré{data.length > 1 ? "s" : ""}</p></div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un modèle…" aria-label="Rechercher un modèle" className="w-full sm:max-w-xs border border-border bg-background px-3 py-2 rounded-sm text-sm" />
        </div>
        {isLoading && <div className="border border-border bg-background p-6 text-sm">Chargement des modèles…</div>}
        {isError && <div role="alert" className="border border-destructive/40 bg-background p-4 text-sm">Les modèles n’ont pas pu être chargés : {(error as Error)?.message ?? "erreur inconnue"}.</div>}
        {!isLoading && !isError && filtered.length === 0 && <div className="border border-dashed border-border bg-background p-8 text-center"><p className="font-semibold">{query ? "Aucun résultat" : "Votre bibliothèque est vide"}</p><p className="text-sm text-muted-foreground mt-1">Créez un premier modèle à partir du formulaire.</p></div>}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => <article key={item.id} className="border border-border bg-background p-4 rounded-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold break-words">{item.name}</h2><span className="inline-block mt-1 text-[10px] uppercase tracking-wider rounded-full bg-muted px-2 py-1">{item.category}</span></div><span className="text-xs text-muted-foreground whitespace-nowrap">{estimateSms(item.content).segments} SMS</span></div>
            <p className="text-sm whitespace-pre-wrap break-words flex-1">{item.content}</p>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3"><button onClick={() => setEditing({ id: item.id, name: item.name, category: item.category, content: item.content })} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-sm hover:border-primary">Modifier</button><button onClick={() => { void navigator.clipboard?.writeText(item.content).then(() => toast.success("Message copié")).catch(() => toast.error("Copie indisponible sur cet appareil")); }} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-sm">Copier le texte</button><button onClick={() => { if (window.confirm("Supprimer définitivement ce modèle ?")) remove.mutate(item.id); }} disabled={remove.isPending} className="px-3 py-1.5 text-xs text-destructive border border-border rounded-sm disabled:opacity-50">Supprimer</button></div>
          </article>)}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="border border-border bg-background p-5 rounded-sm space-y-3">
          <div className="flex justify-between items-center gap-2"><h2 className="font-bold">{editing.id ? "Modifier le modèle" : "Créer un modèle"}</h2>{editing.id && <button onClick={() => setEditing(EMPTY)} className="text-xs text-primary">Nouveau</button>}</div>
          <label className="block text-xs font-semibold">Nom du modèle<input required maxLength={120} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex. Confirmation de commande" className="mt-1 w-full border border-border bg-background px-3 py-2 rounded-sm text-sm" /></label>
          <label className="block text-xs font-semibold">Catégorie<input required maxLength={60} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Marketing, transactionnel…" className="mt-1 w-full border border-border bg-background px-3 py-2 rounded-sm text-sm" /></label>
          <label className="block text-xs font-semibold">Contenu du SMS<textarea required maxLength={1000} rows={7} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Bonjour {prenom}, votre commande {reference} est confirmée." className="mt-1 w-full border border-border bg-background px-3 py-2 rounded-sm text-sm" /></label>
          <div className="grid grid-cols-3 gap-2 text-xs"><div className="bg-muted p-2 rounded-sm"><div className="text-muted-foreground">Encodage</div><strong>{stats.encoding}</strong></div><div className="bg-muted p-2 rounded-sm"><div className="text-muted-foreground">Unités</div><strong>{stats.chars}</strong></div><div className="bg-muted p-2 rounded-sm"><div className="text-muted-foreground">Segments</div><strong>{stats.segments}</strong></div></div>
          <div className="rounded-sm border border-border bg-muted p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Aperçu message</div><p className="text-sm whitespace-pre-wrap break-words">{editing.content || "Votre message apparaîtra ici."}</p></div>
          <button onClick={() => save.mutate()} disabled={!editing.name.trim() || !editing.category.trim() || !editing.content.trim() || save.isPending} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-sm font-semibold disabled:opacity-50">{save.isPending ? "Enregistrement…" : editing.id ? "Enregistrer les modifications" : "Enregistrer le modèle"}</button>
        </div>
        <p className="text-xs text-muted-foreground">Les modèles sont enregistrés dans votre espace client. Les variables entre accolades, par exemple {"{prenom}"}, restent dans le texte pour personnalisation ultérieure.</p>
      </aside>
    </div>
  </DashboardLayout>;
}
