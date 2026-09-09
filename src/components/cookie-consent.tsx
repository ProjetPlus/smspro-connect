import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { loadPlausible, readConsent, saveConsent } from "@/lib/analytics";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setVisible(true);
    } else if (existing.analytics) {
      loadPlausible();
    }
  }, []);

  const accept = () => {
    saveConsent({ analytics: true, timestamp: Date.now() });
    setVisible(false);
  };
  const decline = () => {
    saveConsent({ analytics: false, timestamp: Date.now() });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement cookies"
      className="fixed inset-x-2 bottom-2 z-[60] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md"
    >
      <div className="bg-background border border-border rounded-sm shadow-brand p-4 sm:p-5">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-2">
          Cookies & confidentialité
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Nous utilisons des statistiques anonymes (sans cookies publicitaires) pour améliorer la
          plateforme. Consultez notre{" "}
          <Link to="/confidentialite" className="text-primary underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
          <button
            onClick={decline}
            className="flex-1 border border-border bg-background text-foreground px-3 py-2 rounded-sm text-sm font-semibold hover:bg-muted transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
