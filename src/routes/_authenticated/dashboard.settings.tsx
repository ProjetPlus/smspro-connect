import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, recordConsent } from "@/lib/account.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Paramètres — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [marketing, setMarketing] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setProfile(data);
      setMarketing(!!data?.marketing_consent);
    })();
  }, []);

  async function saveConsent() {
    setBusy(true);
    try {
      await recordConsent({ data: { marketing } });
      toast.success("Préférences enregistrées");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (confirm !== "SUPPRIMER") {
      toast.error("Tapez SUPPRIMER en majuscules pour confirmer");
      return;
    }
    if (!window.confirm("Cette action est définitive. Toutes vos campagnes, SMS, commandes et clés API seront supprimés. Continuer ?")) return;
    setBusy(true);
    try {
      await deleteMyAccount({ data: { confirm: "SUPPRIMER" } });
      await supabase.auth.signOut();
      toast.success("Compte supprimé");
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
      setBusy(false);
    }
  }

  return (
    <DashboardLayout title="Paramètres">
      <div className="space-y-6 max-w-2xl">
        <section className="bg-background border border-border rounded-sm p-5">
          <h2 className="font-display font-bold text-lg mb-3">Mon profil</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between border-b border-border py-1"><dt className="text-foreground/60">Email</dt><dd className="font-mono">{profile?.email}</dd></div>
            <div className="flex justify-between border-b border-border py-1"><dt className="text-foreground/60">Nom</dt><dd>{profile?.full_name ?? "—"}</dd></div>
            <div className="flex justify-between border-b border-border py-1"><dt className="text-foreground/60">Entreprise</dt><dd>{profile?.company ?? "—"}</dd></div>
            <div className="flex justify-between border-b border-border py-1"><dt className="text-foreground/60">Téléphone</dt><dd className="font-mono">{profile?.phone ?? "—"}</dd></div>
            <div className="flex justify-between py-1"><dt className="text-foreground/60">Crédits SMS</dt><dd className="font-mono font-bold">{profile?.sms_credits ?? 0}</dd></div>
          </dl>
        </section>

        <section className="bg-background border border-border rounded-sm p-5">
          <h2 className="font-display font-bold text-lg mb-3">Consentement & confidentialité</h2>
          <p className="text-xs text-foreground/60 mb-3">
            Consentement RGPD enregistré le{" "}
            <span className="font-mono">{profile?.gdpr_consent_at ? new Date(profile.gdpr_consent_at).toLocaleString("fr-FR") : "—"}</span>.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-primary" />
            <span>Recevoir les actualités, offres commerciales et nouveautés produit.</span>
          </label>
          <button onClick={saveConsent} disabled={busy} className="mt-3 px-4 py-2 text-sm bg-foreground text-background rounded-sm font-semibold disabled:opacity-50">
            Enregistrer
          </button>
        </section>

        <section className="bg-background border-2 border-primary rounded-sm p-5">
          <h2 className="font-display font-bold text-lg mb-2 text-primary">Zone de danger — Suppression du compte</h2>
          <p className="text-sm text-foreground/70 mb-3">
            Cette action supprime définitivement votre compte, votre profil, vos campagnes, vos SMS, vos commandes et vos clés API.
            Aucune récupération n'est possible. Conformément au RGPD, cette suppression est immédiate et intégrale.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder='Tapez "SUPPRIMER" pour confirmer'
            className="w-full px-3 py-2 border border-border rounded-sm text-sm mb-3 font-mono"
          />
          <button onClick={handleDelete} disabled={busy || confirm !== "SUPPRIMER"}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
            Supprimer définitivement mon compte
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
