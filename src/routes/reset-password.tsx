import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { updateMyPassword } from "@/lib/password.functions";
import { PasswordField } from "@/components/password-field";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — SMS Pro Mobile" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte SMS Pro Mobile." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses recovery hash automatically and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const policyError = validatePasswordPolicy(password);
    if (policyError) return toast.error(policyError);
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      // Contrôle et écriture côté serveur (politique + fuites connues).
      const result = await updateMyPassword({ data: { password } });
      if (!result.ok) throw new Error(result.error);
      await supabase.auth.refreshSession();

      toast.success("Mot de passe mis à jour. Vous êtes connecté.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-4">
          <Link to="/" className="flex flex-col leading-none">
            <span className="font-display font-black text-primary tracking-tighter text-lg">SMS PRO</span>
            <span className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase">Mobile CI</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Récupération</div>
          <h1 className="font-display text-3xl font-extrabold mb-2">Nouveau mot de passe</h1>
          <p className="text-sm text-foreground/60 mb-6">
            Définissez un mot de passe fort. Vous serez connecté automatiquement.
          </p>

          {!ready ? (
            <div className="p-4 border border-border rounded-sm text-sm text-foreground/70">
              Ouvrez le lien reçu par email depuis cet appareil pour continuer. Si vous êtes déjà
              connecté, vous pouvez changer votre mot de passe ci-dessous.
              <form onSubmit={handleSubmit} className="space-y-3 mt-4">
                <PasswordField required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
                <PasswordField required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-sm font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {loading ? "…" : "Mettre à jour"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordField required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
              <PasswordField required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
              <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-sm font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50">
                {loading ? "…" : "Mettre à jour le mot de passe"}
              </button>
            </form>
          )}

          <div className="mt-6 text-sm text-center">
            <Link to="/auth" className="text-primary font-semibold hover:underline">Retour à la connexion</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
