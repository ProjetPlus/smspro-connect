/**
 * Contrôles serveur du mot de passe : politique locale + vérification des fuites
 * connues via l'API k-anonymity de Have I Been Pwned (compensation applicative
 * de la protection "leaked password" côté fournisseur).
 * Seuls les 5 premiers caractères du hash SHA-1 quittent le serveur.
 */
import { validatePasswordPolicy } from "./password-policy";

export async function isPasswordCompromised(password: string): Promise<boolean> {
  try {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-1", bytes);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!response.ok) return false;

    const body = await response.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count ?? 0) > 0;
    });
  } catch {
    return false;
  }
}

/** Renvoie un message d'erreur, ou null si le mot de passe est acceptable. */
export async function assertPasswordAllowed(password: string): Promise<string | null> {
  const policyError = validatePasswordPolicy(password);
  if (policyError) return policyError;
  if (await isPasswordCompromised(password)) {
    return "Ce mot de passe apparaît dans une fuite de données connue. Choisissez-en un autre.";
  }
  return null;
}
