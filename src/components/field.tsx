import type { ReactNode } from "react";

/** Libellé + champ réutilisable pour les formulaires d'administration. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-[10px] text-foreground/40 mt-1">{hint}</span> : null}
    </label>
  );
}
