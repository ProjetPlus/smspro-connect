import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";

export const Route = createFileRoute("/a-propos")({
  component: AProposPage,
  head: () => ({
    meta: [
      { title: "À propos — SMS Pro Mobile propulsé par NM Technologie" },
      {
        name: "description",
        content:
          "SMS Pro Mobile est une plateforme d'envoi de SMS professionnels en Côte d'Ivoire et Afrique de l'Ouest, propulsée par l'infrastructure télécom de NM Technologie.",
      },
      {
        property: "og:title",
        content: "À propos — SMS Pro Mobile propulsé par NM Technologie",
      },
      {
        property: "og:description",
        content:
          "Notre mission : rendre le SMS marketing accessible aux entreprises ivoiriennes avec une infrastructure télécom robuste.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/a-propos" },
    ],
    links: [{ rel: "canonical", href: "/a-propos" }],
  }),
});

function AProposPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="À propos"
        title={
          <>
            Propulsé par <span className="text-primary">NM Technologie</span>
          </>
        }
        description="SMS Pro Mobile s'appuie sur l'infrastructure télécom de NM Technologie, opérateur reconnu de solutions de communication en Afrique de l'Ouest."
      />

      <section className="px-4 sm:px-8 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="prose prose-neutral max-w-none">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-4">
              Notre mission
            </h2>
            <p className="text-foreground/70 leading-relaxed">
              Rendre le marketing par SMS accessible, fiable et simple d'utilisation pour toutes
              les entreprises ivoiriennes — de la PME au grand compte, en passant par les
              particuliers professionnels. Nous fournissons une plateforme autonome qui couvre
              l'ensemble du parcours : achat de crédit, envoi de campagnes, suivi de livraison et
              API pour les développeurs.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-6">
              Nos engagements
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  k: "Fiabilité",
                  v: "Infrastructure télécom robuste avec un taux de livraison supérieur à 98%.",
                },
                {
                  k: "Transparence",
                  v: "Tarifs clairs en FCFA, sans frais cachés ni engagement de durée.",
                },
                {
                  k: "Autonomie",
                  v: "Une plateforme complète pour gérer vos campagnes sans intervention externe.",
                },
                {
                  k: "Support local",
                  v: "Une équipe basée en Côte d'Ivoire, joignable par WhatsApp et téléphone.",
                },
              ].map((it) => (
                <div key={it.k} className="p-5 bg-muted rounded-sm">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                    {it.k}
                  </div>
                  <p className="text-sm text-foreground/70">{it.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-6">
              Quelques chiffres
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { v: "12.4M+", k: "SMS Envoyés" },
                { v: "98.2%", k: "Livraison" },
                { v: "2 500+", k: "Clients" },
                { v: "< 3s", k: "Latence" },
              ].map((m) => (
                <div key={m.k} className="border-l-2 border-primary pl-4 min-w-0">
                  <div className="font-mono text-xl sm:text-2xl font-bold tracking-tighter truncate">
                    {m.v}
                  </div>
                  <div className="text-[10px] sm:text-xs text-foreground/50 uppercase tracking-wider mt-1">
                    {m.k}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-foreground text-background rounded-sm">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-3">
              Une question sur nos services ?
            </h2>
            <p className="text-background/70 mb-5 text-sm sm:text-base">
              Notre équipe est disponible par WhatsApp, téléphone ou email pour répondre à
              toutes vos questions techniques et commerciales.
            </p>
            <Link
              to="/auth" search={{ mode: "signup" as const }}
              className="inline-block bg-primary text-primary-foreground py-3 px-6 rounded-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
