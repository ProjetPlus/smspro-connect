export type PricingTier = {
  id: string;
  min_sms: number;
  max_sms: number | null;
  unit_price_fcfa: number;
  label: string;
  sort_order: number;
};

/** Grille officielle — utilisée en secours si la base est injoignable. */
export const FALLBACK_TIERS: PricingTier[] = [
  { id: "t1", min_sms: 200, max_sms: 999, unit_price_fcfa: 25, label: "200 à 999 SMS", sort_order: 1 },
  { id: "t2", min_sms: 1000, max_sms: 9999, unit_price_fcfa: 20, label: "1 000 à 9 999 SMS", sort_order: 2 },
  { id: "t3", min_sms: 10000, max_sms: 99999, unit_price_fcfa: 15, label: "10 000 à 99 999 SMS", sort_order: 3 },
  { id: "t4", min_sms: 100000, max_sms: null, unit_price_fcfa: 12, label: "100 000 SMS et plus", sort_order: 4 },
];

export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export function formatUnitPrice(unit: number): string {
  return `${unit.toLocaleString("fr-FR")} FCFA / SMS`;
}

/** Palier correspondant au volume demandé (bornes incluses, max_sms null = illimité). */
export function findTier(tiers: PricingTier[], volume: number): PricingTier | null {
  if (!Number.isFinite(volume) || volume <= 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min_sms - b.min_sms);
  let match: PricingTier | null = null;
  for (const t of sorted) {
    const inRange = volume >= t.min_sms && (t.max_sms === null || volume <= t.max_sms);
    if (inRange) return t;
    if (volume > t.min_sms) match = t; // au-delà du dernier palier borné
    if (volume < t.min_sms && !match) match = t; // en dessous du premier palier
  }
  return match;
}

export function unitPriceFor(tiers: PricingTier[], volume: number): number | null {
  return findTier(tiers, volume)?.unit_price_fcfa ?? null;
}

export function estimateCost(tiers: PricingTier[], volume: number): number | null {
  const unit = unitPriceFor(tiers, volume);
  return unit === null ? null : unit * volume;
}

export function tierRangeLabel(t: Pick<PricingTier, "min_sms" | "max_sms">): string {
  return t.max_sms === null
    ? `${t.min_sms.toLocaleString("fr-FR")} SMS et plus`
    : `${t.min_sms.toLocaleString("fr-FR")} à ${t.max_sms.toLocaleString("fr-FR")} SMS`;
}
