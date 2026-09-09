import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/lib/auth";
import { listAdminNotifications, markNotificationRead, deleteNotification, retryNotificationEmail } from "@/lib/notifications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const roles = await fetchRoles(data.user.id);
    if (!roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  component: NotificationsAdmin,
  head: () => ({ meta: [{ title: "Admin · Notifications" }, { name: "robots", content: "noindex" }] }),
});

function NotificationsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => listAdminNotifications(),
    refetchInterval: 30000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  const read = useMutation({
    mutationFn: (v: { id: string; read: boolean }) => markNotificationRead({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const retry = useMutation({
    mutationFn: (id: string) => retryNotificationEmail({ data: { id } }),
    onSuccess: (r: any) => {
      invalidate();
      if (r?.status === "sent") toast.success("Email renvoyé avec succès");
      else if (r?.status === "skipped") toast.warning(r?.error ?? "Envoi ignoré : email non configuré");
      else toast.error(r?.error ?? "Nouvel échec d'envoi");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteNotification({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Notification supprimée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Notifications">
      <div className="bg-background border border-border rounded-sm overflow-hidden">
        {(rows as any[]).length === 0 && (
          <div className="p-6 text-sm text-foreground/50">Aucune notification.</div>
        )}
        {(rows as any[]).map((n) => (
          <div key={n.id} className={`p-4 border-b border-border last:border-b-0 flex flex-wrap gap-3 justify-between ${n.read_at ? "opacity-60" : ""}`}>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-foreground/60 whitespace-pre-wrap mt-1">{n.body}</div>
              <div className="text-[10px] font-mono text-foreground/40 mt-1">
                {new Date(n.created_at).toLocaleString("fr-FR")} · {n.kind}
                {n.signup_application_id ? ` · dossier ${String(n.signup_application_id).slice(0, 8)}` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-mono uppercase">
                <span className={`px-2 py-1 rounded-sm border ${emailChip(n.email_status)}`}>
                  email : {emailLabel(n.email_status)}
                </span>
                {n.email_sent_at && (
                  <span className="text-foreground/40">envoyé le {new Date(n.email_sent_at).toLocaleString("fr-FR")}</span>
                )}
                {typeof n.email_attempts === "number" && n.email_attempts > 0 && (
                  <span className="text-foreground/40">{n.email_attempts} tentative(s)</span>
                )}
                {n.email_last_attempt_at && (
                  <span className="text-foreground/40">dernier essai {new Date(n.email_last_attempt_at).toLocaleString("fr-FR")}</span>
                )}
                {n.email_error && <span className="text-destructive normal-case">{n.email_error}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {n.link && (
                <Link to={n.link} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-sm">
                  Traiter
                </Link>
              )}
              {n.email_status !== "sent" && (
                <button
                  onClick={() => retry.mutate(n.id)}
                  disabled={retry.isPending}
                  className="text-xs px-3 py-1.5 border border-primary text-primary rounded-sm hover:bg-primary/10 disabled:opacity-50"
                >
                  Réessayer l'envoi
                </button>
              )}
              <button onClick={() => read.mutate({ id: n.id, read: !n.read_at })}
                className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted">
                {n.read_at ? "Marquer non lu" : "Marquer lu"}
              </button>
              <button onClick={() => del.mutate(n.id)}
                className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

function emailLabel(status?: string) {
  return ({ sent: "envoyé", failed: "échec", skipped: "non configuré", pending: "en attente" } as Record<string, string>)[status ?? "pending"] ?? (status ?? "—");
}

function emailChip(status?: string) {
  if (status === "sent") return "border-primary text-primary";
  if (status === "failed") return "border-destructive text-destructive";
  return "border-border text-foreground/50";
}
