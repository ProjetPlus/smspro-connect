import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "spm_install_prompt_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return !!mq || !!ios;
}

/**
 * Popup circulaire animé invitant à installer l'application.
 * Affiché uniquement en navigateur (jamais en mode PWA/standalone),
 * fermeture manuelle + compte à rebours automatique de 30 secondes.
 */
export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(30);
  const deferred = useRef<any>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (window.self !== window.top) return; // pas dans un aperçu iframe
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setLeft(30);
    const iv = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          window.clearInterval(iv);
          setOpen(false);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [open]);

  if (!open) return null;

  const close = (remember: boolean) => {
    if (remember) localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    const evt = deferred.current;
    if (evt?.prompt) {
      await evt.prompt();
      deferred.current = null;
    }
    close(true);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-foreground/50 backdrop-blur-sm p-4 animate-popup-fade">
      <div className="relative aspect-square w-[min(88vw,340px)] rounded-full bg-background border-4 border-primary shadow-brand grid place-items-center text-center px-8 animate-popup-in">
        <button
          type="button"
          onClick={() => close(true)}
          aria-label="Fermer"
          className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <img src="/icon-192.png" alt="SMS Pro Mobile" className="h-14 w-auto object-contain" />
          <div className="font-display text-lg font-extrabold leading-tight">Installer SMS&nbsp;Pro&nbsp;Mobile</div>
          <p className="text-xs text-foreground/60 max-w-[210px]">
            Ajoutez l'application à votre écran d'accueil pour un accès instantané.
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:bg-primary-dark hover:scale-105 active:scale-95 animate-pulse"
          >
            Installer maintenant
          </button>
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
            fermeture auto dans {left}s
          </div>
        </div>
      </div>
    </div>
  );
}
