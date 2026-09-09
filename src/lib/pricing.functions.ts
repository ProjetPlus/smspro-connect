import { createServerFn } from "@tanstack/react-start";
import { createPublicDataClient } from "./public-data-client";
import { FALLBACK_TIERS, type PricingTier } from "./pricing";

export const listPricingTiers = createServerFn({ method: "GET" }).handler(async (): Promise<PricingTier[]> => {
  try {
    const sb = createPublicDataClient();
    const { data, error } = await sb
      .from("pricing_tiers")
      .select("id, min_sms, max_sms, unit_price_fcfa, label, sort_order")
      .eq("active", true)
      .order("sort_order");
    if (error || !data || data.length === 0) return FALLBACK_TIERS;
    return data as PricingTier[];
  } catch {
    return FALLBACK_TIERS;
  }
});
