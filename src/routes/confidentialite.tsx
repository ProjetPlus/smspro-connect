import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";

export const Route = createFileRoute("/confidentialite")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Politique de confidentialité de SMS Pro Mobile : données collectées, cookies, droits RGPD et procédure de suppression de compte.",
      },
      { property: "og:title", content: "Politique de confidentialité — SMS Pro Mobile" },
      {
        property: "og:description",
        content: "Comment nous protégeons vos données personnelles et vos droits.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://smsmobilepro.lovable.app/confidentialite" },
    ],
    links: [{ rel: "canonical", href: "https://smsmobilepro.lovable.app/confidentialite" }],
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

function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Légal"
        title={<>Politique de confidentialité</>}
        description="Comment SMS Pro Mobile collecte, utilise et protège vos données conformément au RGPD et à la loi ivoirienne 2013-450."
      />
      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-widest text-foreground/50 mb-8">
            Dernière mise à jour : janvier 2026
          </p>

          <Section title="1. Responsable du traitement">
            <p>
              SMS Pro Mobile, marque exploitée par NM Technologie, Abidjan, Côte d'Ivoire.
              Contact&nbsp;: contact@smspromobile.ci
            </p>
          </Section>

          <Section title="2. Données collectées">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Formulaire de contact&nbsp;:</strong> nom, entreprise, email, téléphone,
                sujet, message.
              </li>
              <li>
                <strong>Compte client (à venir)&nbsp;:</strong> identifiants, informations de
                facturation, historique de campagnes.
              </li>
              <li>
                <strong>Données techniques&nbsp;:</strong> adresse IP, user-agent, pages visitées
                (statistiques anonymes).
              </li>
            </ul>
          </Section>

          <Section title="3. Finalités">
            <ul className="list-disc pl-5 space-y-2">
              <li>Répondre à vos demandes commerciales et techniques.</li>
              <li>Exécuter les campagnes SMS et facturer les services.</li>
              <li>Améliorer la plateforme (statistiques anonymes).</li>
              <li>Respecter nos obligations légales et réglementaires.</li>
            </ul>
          </Section>

          <Section title="4. Base légale">
            <p>
              Consentement (formulaire, cookies analytiques), exécution du contrat (services SMS),
              intérêt légitime (sécurité), obligation légale (facturation).
            </p>
          </Section>

          <Section title="5. Cookies & consentement">
            <p>
              Nous utilisons uniquement des statistiques anonymes sans cookies publicitaires. Un
              bandeau vous permet d'accepter ou refuser la mesure d'audience. Aucun tracker
              tiers n'est déposé sans votre accord.
            </p>
          </Section>

          <Section title="6. Durée de conservation">
            <ul className="list-disc pl-5 space-y-2">
              <li>Messages de contact&nbsp;: 3 ans.</li>
              <li>Données de facturation&nbsp;: 10 ans (obligation légale).</li>
              <li>Statistiques anonymes&nbsp;: 25 mois.</li>
            </ul>
          </Section>

          <Section title="7. Partage des données">
            <p>
              Vos données ne sont jamais vendues. Elles sont partagées uniquement avec nos
              sous-traitants techniques (hébergement, opérateurs télécoms partenaires pour
              acheminer les SMS) dans le cadre strict du service.
            </p>
          </Section>

          <Section title="8. Vos droits (RGPD)">
            <p>
              Accès, rectification, effacement, opposition, limitation, portabilité. Pour
              exercer vos droits&nbsp;: email à <strong>privacy@smspromobile.ci</strong> avec
              une pièce d'identité.
            </p>
          </Section>

          <Section title="9. Suppression de compte">
            <p>Deux options&nbsp;:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Depuis votre espace client</strong> (une fois le tableau de bord
                disponible)&nbsp;: Paramètres → Compte → Supprimer mon compte.
              </li>
              <li>
                <strong>Par email</strong>&nbsp;: envoyez une demande à{" "}
                <strong>privacy@smspromobile.ci</strong> avec l'email associé au compte. Nous
                supprimons votre compte et vos données personnelles sous 30 jours ; les données
                de facturation sont conservées 10 ans conformément à la loi.
              </li>
            </ol>
          </Section>

          <Section title="10. Sécurité">
            <p>
              Chiffrement TLS en transit, hébergement infrastructures certifiées, contrôles
              d'accès stricts, journalisation des opérations sensibles.
            </p>
          </Section>

          <Section title="11. Réclamation">
            <p>
              Vous pouvez saisir l'Autorité de Régulation des Télécommunications de Côte
              d'Ivoire (ARTCI) ou toute autorité de contrôle compétente si vous estimez que vos
              droits ne sont pas respectés.
            </p>
          </Section>

          <Section title="12. Modifications">
            <p>
              Cette politique peut être mise à jour. La date de dernière modification figure en
              haut du document.
            </p>
          </Section>
        </div>
      </section>
    </SiteLayout>
  );
}
