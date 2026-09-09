/**
 * Carte interactive de l'agence SMS Pro Mobile (Cocody Angré-Mahou).
 * L'iframe Google Maps affiche les commerces et repères alentour ;
 * un repère rouge clignotant met en avant notre position exacte.
 */

export const AGENCY = {
  name: "SMS Pro Mobile",
  address: "Cocody Angré-Mahou, Abidjan, Côte d'Ivoire",
  shareUrl: "https://maps.app.goo.gl/nc3Ga89JyDJVNZaV8",
};

const EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("SMS Pro Mobile, Cocody Angré Mahou, Abidjan") +
  "&z=17&output=embed";

export function LocationMap({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-sm border border-border bg-muted ${className}`}>
      <iframe
        title="Position de SMS Pro Mobile à Cocody Angré-Mahou"
        src={EMBED_URL}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-[320px] sm:h-[440px] border-0"
        allowFullScreen
      />

      {/* Repère rouge clignotant, au premier plan */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <span className="absolute -top-2 h-16 w-16 rounded-full bg-primary/30 animate-ping" />
          <span className="relative h-6 w-6 rounded-full bg-primary ring-4 ring-background shadow-lg" />
          <span className="mt-2 whitespace-nowrap rounded-sm bg-primary px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg">
            {AGENCY.name}
          </span>
          <span className="mt-1 whitespace-nowrap rounded-sm bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
            {AGENCY.address}
          </span>
        </div>
      </div>

      <a
        href={AGENCY.shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 rounded-sm bg-background px-3 py-2 text-xs font-semibold shadow hover:bg-muted"
      >
        Ouvrir l'itinéraire dans Maps →
      </a>
    </div>
  );
}
