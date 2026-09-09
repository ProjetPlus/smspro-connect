import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { AdminToolbar } from "@/components/admin-toolbar";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import {
  listSignupApplications, reviewSignupApplication, deleteSignupApplication,
} from "@/lib/signup.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/signups")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
    status: typeof search['status'] === "string" ? (search['status'] as string) : "all",
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: SignupsAdmin,
  head: () => ({ meta: [{ title: "Admin · Dossiers d'inscription" }, { name: "robots", content: "noindex" }] }),
});

function SignupsAdmin() {
  const qc = useQueryClient();
  const { q, status, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = (patch: Partial<{ q: string; status: string; page: number }>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: apps = [] } = useQuery({ queryKey: ["admin-signups"], queryFn: () => listSignupApplications() });
  const rows = (apps as Record<string, any>[]).filter((a) => status === "all" || a['status'] === status);

  const review = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "approved" | "rejected"; documents_validation_status: "pending" | "valid" | "rejected" }) =>
      reviewSignupApplication({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-signups"] }); toast.success("Dossier mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteSignupApplication({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-signups"] }); toast.success("Dossier supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Dossiers d'inscription">
      <AdminToolbar
        title="Dossiers"
        rows={rows}
        search={q}
        onSearchChange={(v) => setSearch({ q: v, page: 1 })}
        page={page}
        onPageChange={(p) => setSearch({ page: p })}
        searchKeys={["email", "last_name", "first_name", "structure", "client_type", "sender_id"]}
        mapRow={(r) => ({
          Email: r['email'], Nom: `${r['first_name']} ${r['last_name']}`, Mobile: r['mobile'],
          Structure: r['structure'], Type: r['client_type'], Expéditeur: r['sender_id'],
          Pack: r['package_slug'], Statut: r['status'],
          Créé: new Date(r['created_at']).toLocaleString("fr-FR"),
        })}
        filters={
          <select value={status} onChange={(e) => setSearch({ status: e.target.value, page: 1 })}
            className="text-sm px-3 py-2 border border-border rounded-sm bg-background">
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Validé</option>
            <option value="rejected">Rejeté</option>
          </select>
        }
      >
        {({ rows: pageRows }) => (
          <div className="bg-background border border-border rounded-sm overflow-hidden">
            {pageRows.length === 0 && (
              <div className="p-6 text-sm text-foreground/50">Aucun dossier pour le moment.</div>
            )}
            {pageRows.map((a) => (
              <div key={a['id']} className="border-b border-border last:border-b-0">
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {a['first_name']} {a['last_name']} — {a['structure'] || a['client_type']}
                    </div>
                    <div className="text-xs text-foreground/50 truncate">
                      {a['email']} · {a['mobile']} · Expéditeur : {a['sender_id']}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-1 border border-border rounded-sm">
                      {a['status']}
                    </span>
                    <button onClick={() => setOpenId(openId === a['id'] ? null : a['id'])}
                      className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted">
                      Détails
                    </button>
                    <button onClick={() => review.mutate({ id: a['id'], status: "approved", documents_validation_status: "valid" })}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-sm">
                      Valider
                    </button>
                    <button onClick={() => review.mutate({ id: a['id'], status: "rejected", documents_validation_status: "rejected" })}
                      className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted">
                      Rejeter
                    </button>
                    <button onClick={() => { if (confirm("Supprimer ce dossier ?")) del.mutate(a['id']); }}
                      className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted">
                      Supprimer
                    </button>
                  </div>
                </div>
                {openId === a['id'] && (
                  <div className="px-4 pb-4 text-xs space-y-2 text-foreground/70">
                    <div>Type de client : <b>{a['client_type']}</b> {a['client_type_other'] ? `(${a['client_type_other']})` : ""}</div>
                    <div>Pays / Ville : {a['country']} {a['city'] ? `· ${a['city']}` : ""}</div>
                    <div>Fonction : {a['job_title'] || "—"} · Site : {a['website'] || "—"}</div>
                    <div>Pack : {a['package_slug'] || "—"} · Pièce : {a['id_document_type'] || "—"}</div>
                    <div>Contrôle documentaire : <b>{a['documents_validation_status'] || "pending"}</b> · Consentement RGPD : {a['gdpr_consent_at'] ? new Date(a['gdpr_consent_at']).toLocaleString("fr-FR") : "non enregistré"}</div>
                    <div>Exemple de message : {a['sample_message'] || "—"}</div>
                    <div>
                      Documents :
                      <ul className="list-disc pl-5 mt-1">
                        {((a['documents'] as any[]) ?? []).map((d) => (
                          <li key={d.path}>
                            {d.label} —{" "}
                            <button
                              className="underline hover:text-primary"
                              onClick={async () => {
                                const { data, error } = await supabase.storage
                                  .from("kyc-documents").createSignedUrl(d.path, 300);
                                if (error || !data) return toast.error("Document indisponible");
                                window.open(data.signedUrl, "_blank", "noopener");
                              }}
                            >
                              {d.name}
                            </button>
                          </li>
                        ))}
                        {!((a['documents'] as any[]) ?? []).length && <li>Aucun document</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminToolbar>
    </DashboardLayout>
  );
}
