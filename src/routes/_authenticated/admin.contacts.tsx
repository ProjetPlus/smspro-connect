import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listContacts, updateContactStatus, deleteContact } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: ContactsAdmin,
  head: () => ({ meta: [{ title: "Admin · Messages contact" }, { name: "robots", content: "noindex" }] }),
});

function ContactsAdmin() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["admin-contacts"], queryFn: () => listContacts() });
  const inv = () => qc.invalidateQueries({ queryKey: ["admin-contacts"] });
  const upd = useMutation({
    mutationFn: (v: { id: string; status: string }) => updateContactStatus({ data: v }),
    onSuccess: () => { inv(); toast.success("Statut mis à jour"); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteContact({ data: { id } }),
    onSuccess: () => { inv(); toast.success("Supprimé"); },
  });

  return (
    <DashboardLayout title="Messages de contact">
      <div className="space-y-3">
        {items.map((c: any) => (
          <div key={c.id} className="bg-background border border-border rounded-sm p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold">{c.subject}</div>
                <div className="text-xs text-foreground/60 mt-1">
                  <span className="font-mono">{c.email}</span> · {c.name}
                  {c.company && ` · ${c.company}`}
                  {c.phone && ` · ${c.phone}`}
                  {" · "}{new Date(c.created_at).toLocaleString("fr-FR")}
                </div>
                <p className="text-sm mt-3 whitespace-pre-wrap">{c.message}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <select value={c.status} onChange={(e) => upd.mutate({ id: c.id, status: e.target.value })} className="text-xs border border-border rounded-sm px-2 py-1">
                  <option value="new">new</option>
                  <option value="in_progress">in_progress</option>
                  <option value="closed">closed</option>
                </select>
                <div><button onClick={() => confirm("Supprimer ?") && del.mutate(c.id)} className="text-xs text-red-600 hover:underline">Supprimer</button></div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-sm text-center text-foreground/50">Aucun message.</div>}
      </div>
    </DashboardLayout>
  );
}
