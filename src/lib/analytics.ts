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

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

/**
 * Le choix est conservé à la fois en localStorage et dans un cookie propre :
 * si l'un des deux stockages est indisponible (navigation privée, iframe,
 * stockage partitionné), le consentement reste mémorisé et la bannière ne
 * réapparaît pas à chaque rafraîchissement.
 */
export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  const parse = (raw: string | null): ConsentState | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ConsentState;
    } catch {
      return null;
    }
  };
  try {
    return parse(localStorage.getItem(CONSENT_KEY)) ?? parse(readCookie(CONSENT_KEY));
  } catch {
    return parse(readCookie(CONSENT_KEY));
  }
}

export function saveConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(CONSENT_KEY, raw);
  } catch {
    /* stockage indisponible : le cookie prend le relais */
  }
  writeCookie(CONSENT_KEY, raw);
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
