import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { loginWithIdentifier, requestPasswordReset } from "@/lib/auth.functions";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { checkPasswordCompromised } from "@/lib/password.functions";
import { toast } from "sonner";
import { PasswordField } from "@/components/password-field";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Connexion — SMS Pro Mobile" },
      { name: "description", content: "Connectez-vous à votre compte SMS Pro Mobile ou créez-en un." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const { redirect, mode: initialMode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode ?? "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);

  const targetPath = sanitizeRedirect(redirect);

  useEffect(() => {
    if (initialMode === "signup") navigate({ to: "/inscription", replace: true });
  }, [initialMode, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: targetPath as any, replace: true });
      }
    });
  }, [navigate, targetPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !gdpr) {
      toast.error("Vous devez accepter la politique de confidentialité pour créer un compte.");
      return;
    }
    if (mode === "signup") {
      const policyError = validatePasswordPolicy(password);
      if (policyError) {
        toast.error(policyError);
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const leak = await checkPasswordCompromised({ data: { password } });
        if (leak.compromised) {
          toast.error("Ce mot de passe apparaît dans une fuite de données connue. Choisissez-en un autre.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: identifier.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth/callback?redirect=" + encodeURIComponent(targetPath),
            data: {
              full_name: fullName,
              phone,
              company,
              gdpr_consent_at: new Date().toISOString(),
              marketing_consent: marketing,
            },
          },
        });
        if (error) throw error;
        try {
          const { recordConsent } = await import("@/lib/account.functions");
          await recordConsent({ data: { marketing } });
        } catch { /* profile trigger may not be ready yet; ignore */ }
        toast.success("Compte créé. Complétez votre dossier d'inscription.");
        navigate({ to: "/inscription", replace: true });
        return;
      } else {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        if (normalizedIdentifier.includes("@")) {
          const { error } = await supabase.auth.signInWithPassword({
            email: normalizedIdentifier,
            password,
          });
          if (error) throw new Error("Identifiant ou mot de passe incorrect.");
        } else {
          const session = await loginWithIdentifier({ data: { identifier, password } });
          if (!session.ok) throw new Error(session.error);
          const { error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (error) throw error;
        }
        toast.success("Connexion réussie.");
      }

      navigate({ to: targetPath as any, replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!identifier) return toast.error("Entrez votre email d'abord.");
    setLoading(true);
    try {
      await requestPasswordReset({
        data: { identifier, redirectTo: window.location.origin + "/reset-password" },
      });
      toast.success("Si un compte correspond, un email de récupération vient d'être envoyé.");

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
          <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </div>
          <h1 className="font-display text-3xl font-extrabold mb-2">
            {mode === "login" ? "Accédez à votre espace" : "Rejoignez SMS Pro Mobile"}
          </h1>
          <p className="text-sm text-foreground/60 mb-6">
            {mode === "login"
              ? "Connectez-vous avec votre email ou l'identifiant super admin smsmobilepro."
              : "Créez votre compte client, puis gérez vos campagnes depuis le tableau de bord."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Entreprise (optionnel)" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (optionnel)" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
              </>
            )}
            <input required type={mode === "signup" ? "email" : "text"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={mode === "signup" ? "Email" : "Email ou identifiant"} autoComplete="username" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />
            <PasswordField required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (min. 10)" autoComplete="current-password" className="w-full px-4 py-3 border border-border rounded-sm text-sm bg-background" />

            {mode === "signup" && (
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 text-xs text-foreground/70">
                  <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span>
                    J'accepte la{" "}
                    <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>
                    {" "}et les{" "}
                    <Link to="/conditions" className="text-primary underline">conditions d'utilisation</Link>.
                    <span className="text-primary"> *</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-foreground/60">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span>J'accepte de recevoir des offres et actualités par email (optionnel).</span>
                </label>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-sm font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50">
              {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-3 text-right">
              <button type="button" onClick={handleForgot} className="text-xs text-foreground/60 hover:text-primary hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <div className="mt-6 text-sm text-foreground/60 text-center">
            {mode === "login" ? (
              <>Pas encore de compte ?{" "}
                <Link to="/inscription" className="text-primary font-semibold hover:underline">Créer un compte</Link>
              </>
            ) : (
              <>Déjà un compte ?{" "}
                <button className="text-primary font-semibold hover:underline" onClick={() => setMode("login")}>Se connecter</button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function sanitizeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
