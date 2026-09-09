import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: searchSchema,
  component: AuthCallbackPage,
  head: () => ({
    meta: [
      { title: "Connexion Google — SMS Pro Mobile" },
      { name: "description", content: "Finalisation sécurisée de la connexion à SMS Pro Mobile." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Connexion Google — SMS Pro Mobile" },
      { property: "og:description", content: "Finalisation sécurisée de la connexion à SMS Pro Mobile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthCallbackPage() {
  const search = useSearch({ from: "/auth/callback" });
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalisation de la connexion…");
  const targetPath = useMemo(() => sanitizeRedirect(search.redirect), [search.redirect]);

  useEffect(() => {
    let active = true;

    async function finish() {
      if (search.error) {
        setMessage(search.error_description ?? "La connexion Google a été annulée ou refusée.");
        return;
      }

      if (search.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(search.code);
        if (error) {
          if (active) setMessage(error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        navigate({ to: targetPath as any, replace: true });
        return;
      }
      navigate({ to: "/auth", search: { mode: "login", redirect: targetPath }, replace: true });
    }

    void finish();
    return () => {
      active = false;
    };
  }, [navigate, search.code, search.error, search.error_description, targetPath]);

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
        <div className="w-full max-w-md border border-border bg-background p-6 rounded-sm text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Google</div>
          <h1 className="font-display text-2xl font-extrabold mb-3">Connexion SMS Pro Mobile</h1>
          <p className="text-sm text-foreground/60">{message}</p>
        </div>
      </main>
    </div>
  );
}

function sanitizeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}