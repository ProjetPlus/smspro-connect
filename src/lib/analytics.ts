// Client-side analytics helper.
// - Envoie les événements dans notre DB (server fn) pour tableaux de bord internes.
// - Charge le script Plausible (sans cookies) uniquement si consentement analytics.
import { trackEvent } from "./analytics.functions";

const PLAUSIBLE_DOMAIN = "smsmobilepro.lovable.app";
const PLAUSIBLE_SRC = "https://plausible.io/js/script.js";
const CONSENT_KEY = "sms_pro_cookie_consent_v1";

export type ConsentState = {
  analytics: boolean;
  timestamp: number;
};

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function saveConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("consent-changed", { detail: state }));
  if (state.analytics) loadPlausible();
}

export function loadPlausible() {
  if (typeof window === "undefined") return;
  if (document.querySelector(`script[data-plausible]`)) return;
  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
  s.setAttribute("data-plausible", "1");
  s.src = PLAUSIBLE_SRC;
  document.head.appendChild(s);
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const key = "sms_pro_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(eventName: string, properties: EventProps = {}) {
  if (typeof window === "undefined") return;
  // Plausible (uniquement si consenti)
  const consent = readConsent();
  if (consent?.analytics) {
    const w = window as unknown as { plausible?: (n: string, o?: { props?: EventProps }) => void };
    w.plausible?.(eventName, { props: properties });
  }
  // Événement interne (toujours, anonyme, pas de cookie — juste session storage)
  void trackEvent({
    data: {
      event_name: eventName,
      properties: properties as Record<string, unknown>,
      session_id: getSessionId(),
      page_url: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    },
  }).catch(() => {});
}
