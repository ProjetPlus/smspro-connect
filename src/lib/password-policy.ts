/** Shared client/server password policy (compensating control for leaked-password protection). */

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "motdepasse", "azertyuiop", "qwertyuiop",
  "12345678", "123456789", "1234567890", "azerty123", "qwerty123", "admin123",
  "iloveyou", "welcome1", "letmein1", "abc12345", "000000000", "111111111",
]);

export const MIN_PASSWORD_LENGTH = 10;

/** Returns an error message in French, or null when the password is acceptable. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères minimum).`;
  }
  if (password.length > 200) return "Mot de passe trop long.";
  const normalized = password.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) return "Ce mot de passe est trop courant.";
  if (/^(.)\1+$/.test(password)) return "Ce mot de passe est trop simple.";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    return "Le mot de passe doit combiner majuscules, minuscules, chiffres et/ou symboles.";
  }
  return null;
}
