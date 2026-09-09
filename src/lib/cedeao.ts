// Pays CEDEAO + voisins : drapeau, indicatif téléphonique international.
export type CountryOption = { name: string; flag: string; dial: string; iso: string };

export const CEDEAO_COUNTRIES: CountryOption[] = [
  { name: "Bénin", flag: "🇧🇯", dial: "+229", iso: "BJ" },
  { name: "Burkina Faso", flag: "🇧🇫", dial: "+226", iso: "BF" },
  { name: "Cap-Vert", flag: "🇨🇻", dial: "+238", iso: "CV" },
  { name: "Côte d'Ivoire", flag: "🇨🇮", dial: "+225", iso: "CI" },
  { name: "Gambie", flag: "🇬🇲", dial: "+220", iso: "GM" },
  { name: "Ghana", flag: "🇬🇭", dial: "+233", iso: "GH" },
  { name: "Guinée", flag: "🇬🇳", dial: "+224", iso: "GN" },
  { name: "Guinée-Bissau", flag: "🇬🇼", dial: "+245", iso: "GW" },
  { name: "Liberia", flag: "🇱🇷", dial: "+231", iso: "LR" },
  { name: "Mali", flag: "🇲🇱", dial: "+223", iso: "ML" },
  { name: "Niger", flag: "🇳🇪", dial: "+227", iso: "NE" },
  { name: "Nigeria", flag: "🇳🇬", dial: "+234", iso: "NG" },
  { name: "Sénégal", flag: "🇸🇳", dial: "+221", iso: "SN" },
  { name: "Sierra Leone", flag: "🇸🇱", dial: "+232", iso: "SL" },
  { name: "Togo", flag: "🇹🇬", dial: "+228", iso: "TG" },
];

export const OTHER_COUNTRIES: CountryOption[] = [
  { name: "Cameroun", flag: "🇨🇲", dial: "+237", iso: "CM" },
  { name: "Gabon", flag: "🇬🇦", dial: "+241", iso: "GA" },
  { name: "Congo", flag: "🇨🇬", dial: "+242", iso: "CG" },
  { name: "RD Congo", flag: "🇨🇩", dial: "+243", iso: "CD" },
  { name: "Maroc", flag: "🇲🇦", dial: "+212", iso: "MA" },
  { name: "Tunisie", flag: "🇹🇳", dial: "+216", iso: "TN" },
  { name: "France", flag: "🇫🇷", dial: "+33", iso: "FR" },
  { name: "Canada", flag: "🇨🇦", dial: "+1", iso: "CA" },
];

export const ALL_COUNTRIES: CountryOption[] = [...CEDEAO_COUNTRIES, ...OTHER_COUNTRIES];

export function findCountry(name: string): CountryOption | undefined {
  const value = name.trim().toLowerCase();
  return ALL_COUNTRIES.find((c) => c.name.toLowerCase() === value);
}

export function dialFor(name: string): string {
  return findCountry(name)?.dial ?? "";
}

/** Normalise un numéro local + indicatif en E.164 (ex. +2250700000000). */
export function toE164(dial: string, local: string): string {
  const prefix = dial.replace(/[^\d]/g, "");
  let digits = local.replace(/[^\d]/g, "");
  if (prefix && digits.startsWith(prefix)) digits = digits.slice(prefix.length);
  digits = digits.replace(/^0+/, "");
  return prefix ? `+${prefix}${digits}` : `+${digits}`;
}

/** Affichage groupé lisible : +225 07 00 00 00 00 */
export function formatPhone(dial: string, local: string): string {
  const digits = local.replace(/[^\d]/g, "");
  const groups = digits.match(/\d{1,2}/g) ?? [];
  return `${dial} ${groups.join(" ")}`.trim();
}

/** Force le préfixe https:// sans jamais le laisser cassé. */
export function normalizeWebsite(input: string): string {
  let value = input.trim();
  if (!value) return "https://";
  value = value.replace(/^(https?:\/\/)+/i, "");
  return `https://${value.replace(/\s+/g, "")}`;
}
