import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import smsProLogo from "@/assets/sms-pro-mobile-logo.png";

const NAV = [
  { to: "/solutions", label: "Solutions" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/developpeurs", label: "Développeurs" },
  { to: "/documentation", label: "Documentation" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/" className="flex items-center shrink-0" onClick={() => setOpen(false)} aria-label="SMS Pro Mobile — accueil">
          <img
            src={smsProLogo}
            alt="SMS Pro Mobile"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </Link>


        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-primary transition-colors">
                {n.label}
              </Link>
            ))}
          </div>

          {signedIn ? (
            <Link
              to="/dashboard"
              className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 rounded-sm text-xs sm:text-sm font-semibold hover:bg-primary-dark transition-colors active:scale-95 shrink-0"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "login" }}
              onClick={() => track("cta_login_click", { location: "header_icon" })}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground hover:bg-primary-dark transition-colors active:scale-95"
              aria-label="Se connecter"
              title="Se connecter"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden -mr-1 p-2 rounded-sm border border-border"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-sm font-semibold hover:text-primary border-b border-border/60"
              >
                {n.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                to="/auth"
                search={{ mode: "login" }}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-sm font-semibold hover:text-primary flex items-center gap-2"
              >
                <UserRound className="h-4 w-4" />
                Se connecter
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

import nmLogo from "@/assets/nm-technologie-logo.jpg";

export function SiteFooter() {
  return (
    <footer className="px-4 sm:px-8 py-12 bg-background border-t border-border">
      <div className="mx-auto max-w-6xl flex flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <img src={smsProLogo} alt="SMS Pro Mobile" className="h-9 w-auto object-contain" />
            <p className="text-xs text-foreground/50 mt-2 max-w-xs">
              Plateforme SMS professionnelle propulsée par NM Technologie. Solutions de
              communication pour l'Afrique de l'Ouest.
            </p>
          </div>
          <ul className="space-y-2 text-sm font-semibold">
            <li className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              Plateforme
            </li>
            <li><Link to="/solutions" className="hover:text-primary">Solutions</Link></li>
            <li><Link to="/tarifs" className="hover:text-primary">Tarifs</Link></li>
            <li><Link to="/a-propos" className="hover:text-primary">À propos</Link></li>
            <li><Link to="/actualites" className="hover:text-primary">Actualités</Link></li>
            <li><Link to="/developpeurs" className="hover:text-primary">Développeurs</Link></li>
            <li><Link to="/documentation" className="hover:text-primary">Documentation</Link></li>
          </ul>
          <ul className="space-y-2 text-sm font-semibold">
            <li className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              Contact
            </li>
            <li><Link to="/contact" className="hover:text-primary">Nous contacter</Link></li>
            <li>
              <a
                href="https://wa.me/2250707173707"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("cta_whatsapp_click", { location: "footer" })}
                className="hover:text-primary"
              >
                WhatsApp
              </a>
            </li>
          </ul>
          <ul className="space-y-2 text-sm font-semibold">
            <li className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
              Légal
            </li>
            <li><Link to="/confidentialite" className="hover:text-primary">Confidentialité</Link></li>
            <li><Link to="/conditions" className="hover:text-primary">Conditions d'utilisation</Link></li>
          </ul>
        </div>

        {/* Author credit */}
        <div className="border-t border-border pt-6 flex flex-wrap items-center justify-center gap-3 text-center text-xs text-foreground/60">
          <img
            src={nmLogo}
            alt="NM Technologie"
            className="h-10 w-auto max-w-[120px] object-contain shrink-0 bg-white"
            loading="lazy"
          />
          <span>Un produit</span>
          <a
            href="https://ikoffi.agricapital.ci"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground hover:text-primary"
          >
            NM Technologie
          </a>
          <span aria-hidden>-</span>
          <a
            href="https://wa.me/2250707173707"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("cta_whatsapp_click", { location: "footer_author" })}
            className="font-semibold text-foreground hover:text-primary"
          >
            +2250707173707
          </a>
        </div>

        <div className="text-center text-[10px] text-foreground/30 font-mono border-t border-border pt-6">
          © 2026 SMS PRO MOBILE. TOUS DROITS RÉSERVÉS.
        </div>

      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <section className="px-4 pt-12 pb-14 sm:px-8 sm:pt-20 sm:pb-20 bg-muted border-b border-border">
      <div className="mx-auto max-w-6xl animate-fade-up">
        <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-balance mb-4 max-w-3xl">
          {title}
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg max-w-2xl text-pretty">
          {description}
        </p>
      </div>
    </section>
  );
}
