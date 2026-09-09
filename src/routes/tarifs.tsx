import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/site-chrome";
import { listPackages } from "@/lib/packages.functions";
import { listPricingTiers } from "@/lib/pricing.functions";
import { findTier, estimateCost, formatFcfa, formatUnitPrice, type PricingTier } from "@/lib/pricing";

function TierSimulator({ tiers }: { tiers: PricingTier[] }) {
  const [value, setValue] = useState("1000");
  const volume = Number(value);
  const tier = findTier(tiers, volume);
  const total = estimateCost(tiers, volume);
  return (
    <div className="mt-6 bg-background/5 border border-background/10 p-5 rounded-sm">
      <div className="text-[10px] font-mono uppercase tracking-widest text-background/50 mb-3">
        Estimez votre budget
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Nombre de SMS"
          className="w-40 px-3 py-2 rounded-sm text-sm font-mono bg-background text-foreground border border-background/20"
        />
        <span className="text-sm opacity-80">SMS</span>
        {tier ? (
          <>
            <span className="text-sm font-semibold">
              {tier.label} · {formatUnitPrice(tier.unit_price_fcfa)}
            </span>
            {total !== null && (
              <span className="font-display text-xl font-extrabold">= {formatFcfa(total)}</span>
            )}
          </>
        ) : (
          <span className="text-sm opacity-70">Indiquez un volume de SMS</span>
        )}
      </div>
    </div>
  );
}


export const Route = createFileRoute("/tarifs")({
  component: TarifsPage,
  loader: async () => ({
    packages: await listPackages(),
    tiers: await listPricingTiers(),
  }),
  errorComponent: () => <SiteLayout><div className="p-10 text-center">Une erreur est survenue.</div></SiteLayout>,
  notFoundComponent: () => <SiteLayout><div className="p-10 text-center">Page introuvable.</div></SiteLayout>,

  head: () => ({
    meta: [
      { title: "Tarifs SMS dégressifs en FCFA — de 25 à 12 F par SMS | SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Tarifs SMS dégressifs : 25 FCFA de 200 à 999 SMS, 20 FCFA de 1 000 à 9 999, 15 FCFA de 10 000 à 99 999, 12 FCFA au-delà de 100 000. Paiement Mobile Money (MTN, Orange, Wave). Sans frais cachés.",
      },
      {
        property: "og:title",
        content: "Tarifs SMS dégressifs en FCFA — de 25 à 12 FCFA par SMS",
      },
      {
        property: "og:description",
        content:
          "Quatre packages SMS pour PME et grands comptes. Paiement Mobile Money instantané, crédit automatique du compte.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/tarifs" },
    ],
    links: [{ rel: "canonical", href: "/tarifs" }],
  }),
});

function TarifsPage() {
  const { packages, tiers } = Route.useLoaderData();
  return (

    <SiteLayout>
      <PageHero
        eyebrow="Tarifs"
        title={
          <>
            Des packages <span className="text-primary">clairs</span>, en FCFA
          </>
        }
        description="Achetez le volume de SMS qu'il vous faut. Paiement Mobile Money instantané, crédit automatique de votre compte, aucun engagement."
      />

      <section className="px-4 sm:px-8 py-14 sm:py-20 bg-foreground text-background">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "bg-primary p-6 rounded-sm flex flex-col relative"
                    : "bg-background/5 border border-background/10 p-6 rounded-sm flex flex-col"
                }
              >
                {p.featured && (
                  <span className="absolute -top-2 left-4 bg-background text-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                    Populaire
                  </span>
                )}
                <div
                  className={
                    p.featured
                      ? "text-xs font-mono uppercase tracking-widest text-background/80 mb-2"
                      : "text-xs font-mono uppercase tracking-widest text-background/50 mb-2"
                  }
                >
                  {p.name}
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold mb-1">
                  {p.price_fcfa.toLocaleString("fr-FR")}{" "}
                  <span className="text-xs sm:text-sm font-normal opacity-70">FCFA</span>
                </div>
                <div
                  className={
                    p.featured
                      ? "text-sm mb-5 pb-5 border-b border-background/20"
                      : "text-sm mb-5 pb-5 border-b border-background/10"
                  }
                >
                  {p.sms_volume.toLocaleString("fr-FR")} SMS
                </div>
                <ul className="text-sm space-y-2.5 mb-6 flex-grow">
                  {(Array.isArray(p.features) ? (p.features as unknown[]) : []).map((f) => (
                    <li key={String(f)} className={p.featured ? "" : "opacity-80"}>
                      • {String(f)}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  search={{ redirect: `/dashboard/checkout/${p.slug}` }}
                  className={
                    p.featured
                      ? "w-full py-3 bg-background text-primary text-center font-bold hover:opacity-90 transition-opacity"
                      : "w-full py-3 border border-background/20 text-center hover:bg-background hover:text-foreground transition-colors font-semibold"
                  }
                >
                  Choisir
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
              Prix unitaire par palier
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((t) => (
                <div key={t.id} className="bg-background/5 border border-background/10 p-4 rounded-sm">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-background/50">
                    {t.label}
                  </div>
                  <div className="font-display text-xl font-extrabold mt-1">
                    {t.unit_price_fcfa.toLocaleString("fr-FR")}{" "}
                    <span className="text-xs font-normal opacity-70">FCFA / SMS</span>
                  </div>
                </div>
              ))}
            </div>

            <TierSimulator tiers={tiers} />
          </div>




          <div className="mt-10 p-6 bg-background/5 border border-background/10 rounded-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-2">
              Sur mesure
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              Volume supérieur ou besoin spécifique ?
            </h3>
            <p className="text-background/70 text-sm mb-4">
              Nous proposons des devis personnalisés pour les gros volumes, l'intégration API sur
              mesure et les campagnes multi-pays.
            </p>
            <Link
              to="/auth" search={{ mode: "signup" as const }}
              className="inline-block bg-primary text-primary-foreground py-2.5 px-5 rounded-sm font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              Demander un devis
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-8">
            Moyens de paiement
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {["MTN Mobile Money", "Orange Money", "Wave"].map((m) => (
              <div key={m} className="p-5 bg-muted rounded-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
                  Mobile Money
                </div>
                <div className="font-display font-bold text-lg mt-1">{m}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-foreground/60 mt-6">
            Le crédit SMS est automatiquement ajouté à votre compte après confirmation du
            paiement.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
