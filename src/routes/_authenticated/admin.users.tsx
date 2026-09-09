import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { AdminToolbar } from "@/components/admin-toolbar";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listUsers, updateUser, setUserRole, deleteUser, createUser } from "@/lib/admin.functions";
import { toast } from "sonner";
import { PasswordField } from "@/components/password-field";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: UsersPage,
  head: () => ({ meta: [{ title: "Admin · Utilisateurs" }, { name: "robots", content: "noindex" }] }),
});

function UsersPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => listUsers() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "admin" | "client"; grant: boolean }) => setUserRole({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Rôle mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteUser({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Utilisateur supprimé"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Utilisateurs">
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark">
          + Créer un utilisateur
        </button>
      </div>

      {showNew && <NewUserForm onDone={() => { setShowNew(false); invalidate(); }} onCancel={() => setShowNew(false)} />}
      {editing && <EditUserForm user={editing} onDone={() => { setEditing(null); invalidate(); }} onCancel={() => setEditing(null)} />}

      {isLoading && <div className="p-6 text-sm text-center text-foreground/50">Chargement…</div>}

      <AdminToolbar
        title="Utilisateurs"
        rows={users}
        mapRow={(u: any) => ({
          email: u.email,
          nom: u.full_name ?? "",
          entreprise: u.company ?? "",
          telephone: u.phone ?? "",
          credits_sms: u.sms_credits ?? 0,
          roles: (u.user_roles ?? []).map((r: any) => r.role).join("|"),
          cree_le: u.created_at,
        })}
        searchKeys={["email", "full_name", "company", "phone"]}
      >
        {({ rows }) => (
          <div className="bg-background border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted text-left text-xs uppercase font-mono">
                <tr>
                  <th className="p-3">Email</th><th className="p-3">Nom</th><th className="p-3">Crédits</th>
                  <th className="p-3">Rôles</th><th className="p-3">Créé</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: any) => {
                  const roles = (u.user_roles ?? []).map((r: any) => r.role);
                  const isAdmin = roles.includes("admin");
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3 font-mono text-xs">{u.email}</td>
                      <td className="p-3">{u.full_name ?? "—"}</td>
                      <td className="p-3 font-mono">{u.sms_credits ?? 0}</td>
                      <td className="p-3">
                        <button
                          onClick={() => roleMut.mutate({ user_id: u.id, role: "admin", grant: !isAdmin })}
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        >
                          admin {isAdmin ? "✓" : "○"}
                        </button>
                      </td>
                      <td className="p-3 text-xs text-foreground/60">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditing(u)} className="text-xs underline mr-3">Éditer</button>
                        <button onClick={() => { if (confirm(`Supprimer ${u.email} ?`)) del.mutate(u.id); }} className="text-xs text-red-600 hover:underline">Supprimer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminToolbar>
    </DashboardLayout>
  );
}

function NewUserForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [full_name, setName] = useState("");
  const [credits, setCredits] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const create = useMutation({
    mutationFn: () => createUser({ data: { email, password, full_name, sms_credits: credits, role: isAdmin ? "admin" : "client" } }),
    onSuccess: () => { toast.success("Utilisateur créé"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="bg-background border border-border rounded-sm p-5 mb-4 grid gap-3 sm:grid-cols-2">
      <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <PasswordField required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (min 10)" className="w-full px-3 py-2 border border-border rounded-sm text-sm" />
      <input value={full_name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <input type="number" min={0} value={credits} onChange={(e) => setCredits(Number(e.target.value))} placeholder="Crédits SMS" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />Rôle administrateur</label>
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">Créer</button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onDone, onCancel }: { user: any; onDone: () => void; onCancel: () => void }) {
  const [full_name, setName] = useState(user.full_name ?? "");
  const [company, setCompany] = useState(user.company ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [sms_credits, setCredits] = useState(user.sms_credits ?? 0);
  const save = useMutation({
    mutationFn: () => updateUser({ data: { id: user.id, full_name, company, phone, sms_credits } }),
    onSuccess: () => { toast.success("Enregistré"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="bg-background border border-primary rounded-sm p-5 mb-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 text-xs font-mono uppercase tracking-widest text-primary">Éditer {user.email}</div>
      <input value={full_name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Entreprise" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <input type="number" value={sms_credits} onChange={(e) => setCredits(Number(e.target.value))} placeholder="Crédits SMS" className="px-3 py-2 border border-border rounded-sm text-sm" />
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm">Annuler</button>
        <button type="submit" disabled={save.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">Enregistrer</button>
      </div>
    </form>
  );
}
