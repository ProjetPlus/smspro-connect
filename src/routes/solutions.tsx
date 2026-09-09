import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";

export const Route = createFileRoute("/solutions")({
  component: SolutionsPage,
  head: () => ({
    meta: [
      { title: "Solutions SMS — Marketing Ciblé, SMS Enrichi, API Gateway | SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Découvrez nos trois solutions SMS pour entreprises en Côte d'Ivoire : Marketing Ciblé, SMS Enrichi avec liens trackables et SMS Gateway API pour intégrations.",
      },
      {
        property: "og:title",
        content: "Solutions SMS — Marketing Ciblé, SMS Enrichi, API Gateway",
      },
      {
        property: "og:description",
        content:
          "Trois canaux pour communiquer avec vos clients : campagnes marketing, SMS enrichis et API Gateway pour développeurs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/solutions" },
    ],
    links: [{ rel: "canonical", href: "/solutions" }],
  }),
});

const solutions = [
  {
    n: "01",
    title: "Marketing Ciblé",
    lead: "Diffusez des offres promotionnelles à des segments précis de votre base clients.",
    features: [
      "Segmentation par groupes de contacts",
      "Personnalisation du nom émetteur (Sender ID)",
      "Planification immédiate ou différée",
      "Rapport de campagne en temps réel",
    ],
  },
  {
    n: "02",
    title: "SMS Enrichi",
    lead: "Ajoutez liens courts trackables, visuels et landing pages mobiles pour booster votre conversion.",
    features: [
      "Liens courts avec statistiques de clics",
      "Landing pages mobiles optimisées",
      "Suivi conversion par campagne",
      "Templates de messages réutilisables",
    ],
  },
  {
    n: "03",
    title: "SMS Gateway API",
    lead: "Intégrez l'envoi de SMS directement dans vos applications métier via notre API REST sécurisée.",
    features: [
      "API REST avec authentification par clé",
      "Webhooks de livraison en temps réel",
      "Documentation développeur complète",
      "SLA et priorité d'envoi garantie",
    ],
  },
];

function SolutionsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Nos Solutions"
        title={
          <>
            Trois canaux SMS, <span className="text-primary">une plateforme unifiée</span>
          </>
        }
        description="Marketing, transactionnel ou API — choisissez le canal adapté à votre besoin et pilotez tout depuis un seul espace client."
      />

      <section className="px-4 sm:px-8 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-6">
          {solutions.map((s) => (
            <article
              key={s.n}
              className="grid gap-6 md:grid-cols-[auto_1fr] p-6 sm:p-8 bg-background border border-border rounded-sm"
            >
              <div className="w-12 h-12 bg-primary/5 text-primary flex items-center justify-center rounded-sm shrink-0">
                <span className="font-mono font-bold text-lg">{s.n}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-2">
                  {s.title}
                </h2>
                <p className="text-foreground/70 mb-5">{s.lead}</p>
                <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                  {s.features.map((f) => (
                    <li key={f} className="flex gap-2 text-foreground/80">
                      <span className="text-primary shrink-0">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              to="/tarifs"
              className="bg-primary text-primary-foreground text-center py-3.5 px-6 rounded-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Voir les tarifs
            </Link>
            <Link
              to="/auth" search={{ mode: "signup" as const }}
              className="bg-background border border-border text-center py-3.5 px-6 rounded-sm font-semibold hover:border-primary transition-colors"
            >
              Demander un accès API
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
