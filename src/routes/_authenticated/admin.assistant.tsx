import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { exportCSV } from "@/lib/export-csv";
import {
  listAssistantLeads,
  listAssistantKnowledge,
  upsertAssistantKnowledge,
  deleteAssistantKnowledge,
  getAssistantConversation,
} from "@/lib/patco-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/assistant")({
  component: AssistantAdminPage,
  head: () => ({
    meta: [
      { title: "Assistant Patco — Administration" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AssistantAdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"leads" | "kb">("leads");
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", title: "", content: "", category: "general", active: true });

  const leads = useQuery({ queryKey: ["assistant-leads"], queryFn: () => listAssistantLeads() });
  const kb = useQuery({ queryKey: ["assistant-kb"], queryFn: () => listAssistantKnowledge() });
  const conversation = useQuery({
    queryKey: ["assistant-conversation", openSession],
    queryFn: () => getAssistantConversation({ data: { session_id: openSession! } }),
    enabled: Boolean(openSession),
  });

  const save = useMutation({
    mutationFn: () =>
      upsertAssistantKnowledge({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title,
          content: form.content,
          category: form.category,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success("Connaissance enregistrée");
      setForm({ id: "", title: "", content: "", category: "general", active: true });
      void qc.invalidateQueries({ queryKey: ["assistant-kb"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAssistantKnowledge({ data: { id } }),
    onSuccess: () => {
      toast.success("Supprimé");
      void qc.invalidateQueries({ queryKey: ["assistant-kb"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = leads.data?.leads ?? [];

  return (
    <DashboardLayout title="Assistant Patco">
      <div className="flex gap-2 mb-5">
        {(["leads", "kb"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-sm ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {t === "leads" ? "Contacts collectés" : "Base de connaissances"}
          </button>
        ))}
      </div>

      {tab === "leads" && (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-foreground/60">{rows.length} contact(s) collecté(s) par Patco.</p>
            <button
              className="px-3 py-2 text-sm border border-border rounded-sm hover:border-primary"
              onClick={() =>
                exportCSV(
                  "contacts-patco.csv",
                  rows.map((l: any) => ({
                    nom: l.full_name ?? "",
                    email: l.email ?? "",
                    telephone: l.phone ?? "",
                    pays: l.country ?? "",
                    ville: l.city ?? "",
                    besoin: l.interest ?? "",
                    messages: l.message_count,
                    derniere_visite: new Date(l.last_seen_at).toLocaleString("fr-FR"),
                  })),
                )
              }
            >
              Exporter CSV
            </button>
          </div>

          <div className="bg-background border border-border rounded-sm overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted text-[10px] uppercase font-mono">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">E-mail</th>
                  <th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-left">Pays / Ville</th>
                  <th className="p-3 text-left">Besoin</th>
                  <th className="p-3">Msg</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-foreground/50">
                      Aucun contact pour le moment.
                    </td>
                  </tr>
                )}
                {rows.map((l: any) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3 font-semibold">{l.full_name ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">{l.email ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">{l.phone ?? "—"}</td>
                    <td className="p-3 text-xs">{[l.country, l.city].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="p-3 text-xs">{l.interest ?? "—"}</td>
                    <td className="p-3 text-center font-mono">{l.message_count}</td>
                    <td className="p-3 text-right">
                      <button
                        className="text-xs underline"
                        onClick={() => setOpenSession(openSession === l.session_id ? null : l.session_id)}
                      >
                        {openSession === l.session_id ? "Masquer" : "Conversation"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openSession && (
            <div className="mt-4 bg-background border border-border rounded-sm p-4 space-y-2 max-h-96 overflow-y-auto">
              {(conversation.data?.messages ?? []).map((m: any, i: number) => (
                <div key={i} className="text-sm">
                  <span className="text-[10px] font-mono uppercase text-foreground/50 mr-2">
                    {m.role === "user" ? "Visiteur" : "Patco"}
                  </span>
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "kb" && (
        <>
          <div className="bg-background border border-border rounded-sm p-4 mb-5 grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titre (ex. Délai de validation KYC)"
              className="px-3 py-2 border border-border rounded-sm text-sm"
            />
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Catégorie"
              className="px-3 py-2 border border-border rounded-sm text-sm"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Réponse que Patco doit connaître…"
              className="sm:col-span-2 px-3 py-2 border border-border rounded-sm text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Actif
            </label>
            <div className="flex justify-end gap-2">
              {form.id && (
                <button
                  onClick={() => setForm({ id: "", title: "", content: "", category: "general", active: true })}
                  className="px-4 py-2 text-sm border border-border rounded-sm"
                >
                  Annuler
                </button>
              )}
              <button
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold disabled:opacity-40"
              >
                {form.id ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {(kb.data?.items ?? []).map((k: any) => (
              <div key={k.id} className="bg-background border border-border rounded-sm p-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{k.title}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-muted">{k.category}</span>
                  {!k.active && <span className="text-[10px] font-mono uppercase text-red-600">inactif</span>}
                  <div className="ml-auto flex gap-3 text-xs">
                    <button
                      className="underline"
                      onClick={() =>
                        setForm({
                          id: k.id,
                          title: k.title,
                          content: k.content,
                          category: k.category,
                          active: k.active,
                        })
                      }
                    >
                      Modifier
                    </button>
                    <button className="underline text-red-600" onClick={() => remove.mutate(k.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground/70 mt-2 whitespace-pre-wrap">{k.content}</p>
              </div>
            ))}
            {(kb.data?.items ?? []).length === 0 && (
              <p className="text-sm text-foreground/50">
                Aucune connaissance ajoutée. Patco utilise déjà les packs, tarifs et procédures de la plateforme.
              </p>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
