import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";

export const Route = createFileRoute("/conditions")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation de la plateforme SMS Pro Mobile : services, obligations, paiement Mobile Money et responsabilités.",
      },
      { property: "og:title", content: "Conditions d'utilisation — SMS Pro Mobile" },
      {
        property: "og:description",
        content: "Règles d'utilisation de la plateforme SMS Pro Mobile.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://smsmobilepro.lovable.app/conditions" },
    ],
    links: [{ rel: "canonical", href: "https://smsmobilepro.lovable.app/conditions" }],
  }),
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-3">{title}</h2>
      <div className="space-y-3 text-sm sm:text-base text-foreground/80 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Légal"
        title={<>Conditions d'utilisation</>}
        description="Règles et engagements réciproques pour l'utilisation de SMS Pro Mobile."
      />
      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mb-8">
            Dernière mise à jour : janvier 2026
          </p>

          <Section title="1. Objet">
            <p>
              Les présentes conditions régissent l'utilisation de la plateforme SMS Pro Mobile
              (envoi de SMS marketing, alertes transactionnelles et API Gateway).
            </p>
          </Section>

          <Section title="2. Éditeur">
            <p>NM Technologie — Abidjan, Côte d'Ivoire — contact@smspromobile.ci.</p>
          </Section>

          <Section title="3. Compte client">
            <p>
              L'accès aux services nécessite un compte. Vous êtes responsable de la
              confidentialité de vos identifiants. Toute activité effectuée depuis votre compte
              est présumée réalisée par vous.
            </p>
          </Section>

          <Section title="4. Services & forfaits">
            <p>
              Les forfaits, prix et volumes sont détaillés sur la page{" "}
              <a href="/tarifs" className="text-primary underline underline-offset-2">
                Tarifs
              </a>
              . Les crédits SMS sont valables 12 mois à compter de l'achat.
            </p>
          </Section>

          <Section title="5. Paiement Mobile Money">
            <p>
              Paiements acceptés&nbsp;: Orange Money, MTN Mobile Money, Moov Money, Wave. Les
              paiements sont exécutés par nos prestataires (CinetPay / FedaPay). Une facture est
              émise pour chaque commande.
            </p>
          </Section>

          <Section title="6. Utilisation acceptable">
            <p>Vous vous engagez à ne pas utiliser la plateforme pour&nbsp;:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Envoyer du spam ou des messages non sollicités.</li>
              <li>Diffuser des contenus illégaux, injurieux ou frauduleux.</li>
              <li>
                Contourner les règles des opérateurs télécoms (Sender ID, plages horaires, opt-out).
              </li>
              <li>Envoyer des SMS à des destinataires n'ayant pas donné leur consentement.</li>
            </ul>
          </Section>

          <Section title="7. Consentement des destinataires">
            <p>
              Vous êtes seul responsable de la collecte du consentement de vos destinataires et
              du respect de la réglementation applicable (RGPD, loi ivoirienne 2013-450). Chaque
              SMS marketing doit permettre le désabonnement (STOP au XXXXX).
            </p>
          </Section>

          <Section title="8. Disponibilité">
            <p>
              Nous visons une disponibilité de 99,9%. Des interruptions peuvent survenir pour
              maintenance ou en cas de force majeure (panne opérateur, catastrophe naturelle).
            </p>
          </Section>

          <Section title="9. Responsabilité">
            <p>
              Notre responsabilité est limitée au montant payé pour le service concerné sur les
              12 derniers mois. Nous ne sommes pas responsables des dommages indirects.
            </p>
          </Section>

          <Section title="10. Résiliation & suppression de compte">
            <p>
              Vous pouvez fermer votre compte à tout moment depuis votre espace client ou par
              email à <strong>support@smspromobile.ci</strong>. Nous pouvons suspendre un compte
              en cas de manquement grave. Les crédits non consommés ne sont pas remboursés
              au-delà de 14 jours après l'achat.
            </p>
          </Section>

          <Section title="11. Données personnelles">
            <p>
              Consultez notre{" "}
              <a href="/confidentialite" className="text-primary underline underline-offset-2">
                politique de confidentialité
              </a>
              .
            </p>
          </Section>

          <Section title="12. Droit applicable">
            <p>
              Droit ivoirien. En cas de litige, compétence exclusive des tribunaux d'Abidjan
              après tentative de règlement amiable.
            </p>
          </Section>
        </div>
      </section>
    </SiteLayout>
  );
}
