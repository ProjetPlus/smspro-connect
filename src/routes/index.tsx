import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-chrome";
import { HeroCarousel } from "@/components/hero-carousel";
import { TrustCarousel } from "@/components/trust-carousel";
import { listPackages } from "@/lib/packages.functions";
import { listPricingTiers } from "@/lib/pricing.functions";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: async () => ({
    packages: await listPackages(),
    tiers: await listPricingTiers(),
  }),
  errorComponent: () => <SiteLayout><div className="p-10 text-center">Une erreur est survenue.</div></SiteLayout>,
  notFoundComponent: () => <SiteLayout><div className="p-10 text-center">Page introuvable.</div></SiteLayout>,

  head: () => ({
    meta: [
      { title: "SMS Pro Mobile — Plateforme SMS professionnelle en Côte d'Ivoire" },
      {
        name: "description",
        content:
          "SMS Pro Mobile : plateforme SMS mobile pro pour vos campagnes marketing, alertes et OTP en Côte d'Ivoire et CEDEAO. Mobile Money, API SMS, 98 % de livraison.",
      },
      { name: "keywords", content: "SMS mobile pro, SMS pro mobile, SMS marketing Côte d'Ivoire, plateforme SMS CEDEAO, API SMS Abidjan" },
      { property: "og:site_name", content: "SMS Pro Mobile" },
      { property: "og:title", content: "SMS Pro Mobile — Plateforme SMS professionnelle en Côte d'Ivoire" },
      {
        property: "og:description",
        content:
          "Campagnes SMS marketing, alertes et API SMS pour entreprises en Côte d'Ivoire et Afrique de l'Ouest. Paiement Mobile Money, envoi en quelques minutes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SMS Pro Mobile — Plateforme SMS professionnelle" },

      {
        name: "twitter:description",
        content: "SMS marketing, alertes et API SMS en Côte d'Ivoire et CEDEAO. Paiement Mobile Money.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "SMS Mobile Pro",
          alternateName: "SMS Pro Mobile",
          description:
            "Plateforme SMS professionnelle : campagnes marketing, alertes et API SMS en Côte d'Ivoire et CEDEAO.",
          telephone: "+225 07 07 17 37 07",
          email: "infos@smspromobile.com",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Cocody Angré-Mahou",
            addressLocality: "Abidjan",
            addressCountry: "CI",
          },
          areaServed: "Afrique de l'Ouest",
          hasMap: "https://maps.app.goo.gl/nc3Ga89JyDJVNZaV8",
        }),
      },
    ],
  }),
});

function LandingPage() {
  const { packages, tiers } = Route.useLoaderData();
  return (

    <SiteLayout>
      {/* Hero */}
      <section className="px-4 pt-10 pb-14 sm:px-8 sm:pt-16 sm:pb-24 bg-muted">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-background border border-border rounded-full mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/70 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60 font-mono">
                  Services Opérationnels
                </span>
              </div>
              <h1 className="font-display font-extrabold text-[2rem] sm:text-6xl leading-[1.05] tracking-tight text-balance mb-6">
                Propulsez votre business par <span className="text-primary">SMS</span>
              </h1>
              <p className="text-foreground/70 text-base sm:text-xl mb-8 max-w-[42ch] text-pretty">
                La plateforme leader pour vos campagnes marketing et alertes critiques en Côte
                d'Ivoire et Afrique de l'Ouest.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:max-w-md">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="flex-1 bg-primary text-primary-foreground text-center py-4 px-6 rounded-sm font-semibold shadow-[var(--shadow-hero)] transition-transform active:scale-[0.98] hover:bg-primary-dark"
                >
                  Créer un compte gratuit
                </Link>
                <Link
                  to="/tarifs"
                  className="flex-1 bg-background border border-border text-center py-4 px-6 rounded-sm font-semibold hover:border-primary transition-colors"
                >
                  Voir les tarifs
                </Link>
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:150ms]">
              <HeroCarousel />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 animate-fade-up [animation-delay:200ms]">
            {[
              { value: "12.4M+", label: "SMS Envoyés" },
              { value: "98.2%", label: "Taux de livraison" },
              { value: "2 500+", label: "Clients actifs" },
              { value: "< 3s", label: "Temps de réception" },
            ].map((m) => (
              <div key={m.label} className="border-l-2 border-primary pl-4 min-w-0">
                <div className="font-mono text-xl sm:text-3xl font-bold tracking-tighter truncate">
                  {m.value}
                </div>
                <div className="text-[10px] sm:text-xs text-foreground/50 uppercase tracking-wider mt-1">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
              Nos Solutions
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Trois canaux, une plateforme
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Marketing Ciblé",
                desc: "Atteignez vos clients directement sur leurs mobiles avec des offres personnalisées et segmentées.",
              },
              {
                n: "02",
                title: "SMS Enrichi",
                desc: "Insérez des liens courts trackables et des visuels pour booster votre taux de conversion.",
              },
              {
                n: "03",
                title: "SMS Gateway API",
                desc: "API REST robuste pour intégrer l'envoi de SMS directement dans vos applications métier.",
              },
            ].map((s) => (
              <Link
                key={s.n}
                to="/solutions"
                className="group p-5 sm:p-6 bg-background border border-border rounded-sm hover:border-primary transition-colors"
              >
                <div className="w-10 h-10 bg-primary/5 text-primary flex items-center justify-center rounded-sm mb-4">
                  <span className="font-mono font-bold">{s.n}</span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="px-4 py-16 sm:px-8 sm:py-24 bg-foreground text-background">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">
              Tarifs
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-3">
              Tarifs Clairs
            </h2>
            <p className="text-background/60 text-sm sm:text-base">
              Sans frais cachés. Paiement Mobile Money (MTN, Orange, Wave).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <div
                key={p.slug}
                className={
                  p.featured
                    ? "bg-primary p-5 sm:p-6 rounded-sm flex flex-col"
                    : "bg-background/5 border border-background/10 p-5 sm:p-6 rounded-sm flex flex-col"
                }
              >
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
                <div className="text-sm mb-4">{p.sms_volume.toLocaleString("fr-FR")} SMS</div>
                <Link
                  to="/tarifs"
                  className={
                    p.featured
                      ? "mt-auto w-full py-2.5 bg-background text-primary font-bold text-center text-sm hover:opacity-90 transition-opacity"
                      : "mt-auto w-full py-2.5 border border-background/20 hover:bg-background hover:text-foreground text-center text-sm transition-colors font-semibold"
                  }
                >
                  {p.featured ? "Plus populaire" : "Choisir"}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => (
              <div key={t.id} className="bg-background/5 border border-background/10 p-4 rounded-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-background/50">
                  {t.label}
                </div>
                <div className="font-display text-xl font-extrabold mt-1">
                  {t.unit_price_fcfa} <span className="text-xs font-normal opacity-70">FCFA / SMS</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section className="px-4 py-16 sm:px-8 sm:py-24 bg-muted">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Plateforme</div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Tout ce qu'il faut pour envoyer, mesurer et scaler
            </h2>
            <p className="text-foreground/70 mt-3 text-sm sm:text-base">
              Un dashboard clair, une API robuste, des paiements Mobile Money et une équipe locale
              qui parle votre langue.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Éditeur de campagne", d: "Rédigez, ciblez par segment, planifiez l'envoi et suivez les livraisons en temps réel." },
              { t: "Contacts & segments", d: "Importez CSV, dédupliquez automatiquement, gérez opt-in/opt-out en conformité RGPD light." },
              { t: "SMS transactionnel", d: "OTP, notifications, alertes critiques avec priorité et fallback multi-opérateur." },
              { t: "API REST & Webhooks", d: "Intégration en quelques lignes, callbacks de livraison signés, clés révocables par projet." },
              { t: "Paiement Mobile Money", d: "Orange, MTN, Moov, Wave. Crédits SMS ajoutés automatiquement à la confirmation." },
              { t: "Statistiques avancées", d: "Taux de livraison, clics sur liens courts, coût par SMS, export CSV & PDF." },
              { t: "Sender ID personnalisé", d: "Affichez votre marque au lieu d'un numéro. Validation opérateur incluse." },
              { t: "Support local", d: "Équipe basée à Abidjan, réponse WhatsApp sous 30 min en journée ouvrée." },
              { t: "Sécurité entreprise", d: "Rôles fins, RLS, chiffrement au repos, audit log — conformité opérateur." },
            ].map((f) => (
              <div key={f.t} className="p-5 bg-background border border-border rounded-sm hover:border-primary/40 transition-colors">
                <h3 className="font-display font-bold text-base sm:text-lg mb-2">{f.t}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cas d'usage */}
      <section className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Cas d'usage</div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Fait pour toutes les industries
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "E-commerce", d: "Relances panier, confirmations, promos flash." },
              { t: "Fintech & Banques", d: "OTP, alertes transaction, rappels d'échéance." },
              { t: "Santé", d: "Rappels de rendez-vous, résultats, campagnes de prévention." },
              { t: "Éducation", d: "Notes, absences, communication parents." },
              { t: "Événementiel", d: "Confirmations, rappels J-1, coordonnées site." },
              { t: "Immobilier", d: "Nouvelles annonces, visites, relance leads." },
              { t: "ONG & Politique", d: "Mobilisation, sondages, alertes terrain." },
              { t: "Logistique", d: "Suivi de livraison, code retrait, notification chauffeur." },
            ].map((u) => (
              <div key={u.t} className="border-l-2 border-primary pl-4 py-1">
                <div className="font-display font-bold text-sm sm:text-base">{u.t}</div>
                <div className="text-xs sm:text-sm text-foreground/60 mt-1 leading-relaxed">{u.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-4 py-16 sm:px-8 sm:py-24 bg-muted">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Workflow</div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Envoyez votre première campagne en 4 étapes
            </h2>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
            {[
              { n: "01", t: "Créez votre compte", d: "Inscription gratuite en 30 secondes, sans carte bancaire." },
              { n: "02", t: "Achetez un pack", d: "Paiement Mobile Money instantané. Crédits ajoutés automatiquement." },
              { n: "03", t: "Importez vos contacts", d: "CSV, copier-coller ou via API. Segmentation en un clic." },
              { n: "04", t: "Lancez & mesurez", d: "Suivi de livraison temps réel, rapport détaillé exportable." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-5 border border-border rounded-sm">
                <div className="font-mono text-primary font-bold text-lg mb-2">{s.n}</div>
                <div className="font-display font-bold mb-1">{s.t}</div>
                <div className="text-sm text-foreground/60 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Ils nous font confiance</div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Des entreprises qui livrent des millions de SMS
            </h2>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {[
              { q: "Depuis qu'on est passés sur SMS Pro Mobile, notre taux d'ouverture est de 97%. Aucun email ne fait ça.", a: "Aïcha K.", r: "CMO, Retail Abidjan" },
              { q: "L'API a été intégrée à notre core banking en une journée. Les OTP passent en moins de 3 secondes.", a: "Ismaël B.", r: "CTO, Fintech CI" },
              { q: "Le paiement Mobile Money change tout. Plus besoin de virement, mes packs sont crédités instantanément.", a: "Fatou D.", r: "Fondatrice, e-commerce" },
            ].map((t) => (
              <figure key={t.a} className="p-6 bg-background border border-border rounded-sm">
                <blockquote className="text-sm sm:text-base text-foreground/80 italic leading-relaxed">« {t.q} »</blockquote>
                <figcaption className="mt-4 pt-4 border-t border-border">
                  <div className="font-bold text-sm">{t.a}</div>
                  <div className="text-xs text-foreground/50">{t.r}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-8 sm:py-24 bg-muted">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10">
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">FAQ</div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
              Les questions fréquentes
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Combien coûte un SMS ?", a: "À partir de 12 FCFA/SMS selon le volume (25 F de 200 à 999, 20 F de 1 000 à 9 999, 15 F de 10 000 à 99 999, 12 F au-delà de 100 000). Aucun frais d'abonnement, pas de minimum." },
              { q: "Quels opérateurs sont couverts ?", a: "Orange, MTN et Moov en Côte d'Ivoire, avec routage optimisé vers l'Afrique de l'Ouest." },
              { q: "Puis-je utiliser mon nom de marque comme expéditeur ?", a: "Oui, Sender ID alphanumérique jusqu'à 11 caractères après validation opérateur (24h)." },
              { q: "Est-ce conforme RGPD ?", a: "Oui : opt-in explicite, opt-out automatique par STOP, journalisation et droit à l'oubli." },
              { q: "Puis-je tester gratuitement ?", a: "Créez un compte gratuit et recevez des crédits de test pour valider vos intégrations." },
              { q: "Comment se passe le paiement ?", a: "Mobile Money (Orange, MTN, Moov, Wave) instantané via CinetPay/FedaPay. Facture PDF fournie." },
            ].map((f) => (
              <details key={f.q} className="group bg-background border border-border rounded-sm p-4">
                <summary className="cursor-pointer font-semibold text-sm sm:text-base flex justify-between items-center gap-4">
                  <span>{f.q}</span>
                  <span className="text-primary text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-foreground/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <TrustCarousel />



      {/* Contact / Devis */}
      <section className="px-4 py-16 sm:px-8 sm:py-20 bg-background border-t border-border">
        <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2 items-start">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Contact · Devis</div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-balance">
              Un volume important ? Un besoin sur mesure ?
            </h2>
            <p className="text-foreground/70 mb-6">
              Créez votre compte pour accéder immédiatement à l'espace client, obtenir un devis personnalisé
              et discuter avec un expert SMS Pro Mobile. Aucun engagement, activation en 2 minutes.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-primary font-bold">✓</span> Tarifs dégressifs au-delà de 50 000 SMS/mois</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold">✓</span> Intégration API et onboarding gratuits</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold">✓</span> Support dédié 6j/7 en français</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold">✓</span> Paiement Mobile Money (Orange, MTN, Moov, Wave)</li>
            </ul>
          </div>
          <div className="bg-muted border border-border rounded-sm p-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">Démarrer</div>
            <div className="font-display text-2xl font-extrabold mb-4">Créez votre compte</div>
            <p className="text-sm text-foreground/70 mb-5">
              L'inscription vous donne accès au dashboard, aux crédits d'essai et au devis en ligne.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/auth" search={{ mode: "signup" }} className="w-full bg-primary text-primary-foreground text-center py-3 rounded-sm font-bold hover:bg-primary-dark transition-colors">
                S'inscrire — c'est gratuit
              </Link>
              <Link to="/auth" search={{ mode: "login" }} className="w-full bg-background border border-border text-center py-3 rounded-sm font-semibold hover:border-primary transition-colors">
                J'ai déjà un compte
              </Link>
            </div>
            <p className="text-[11px] text-foreground/50 mt-4 text-center">
              Besoin d'un contact direct ?{" "}
              <a href="https://wa.me/2250700000000" target="_blank" rel="noopener noreferrer" className="text-primary underline">WhatsApp</a>
              {" · "}
              <Link to="/contact" className="text-primary underline">Formulaire</Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 py-16 sm:px-8 sm:py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-balance">
            Prêt à envoyer vos premiers SMS ?
          </h2>
          <p className="text-primary-foreground/90 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
            Créez votre compte gratuitement et lancez votre première campagne en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Link to="/auth" search={{ mode: "signup" }} className="flex-1 bg-background text-primary py-4 px-6 rounded-sm font-bold hover:opacity-90 transition-opacity">
              Créer mon compte
            </Link>
            <Link to="/tarifs" className="flex-1 border border-primary-foreground/30 py-4 px-6 rounded-sm font-semibold hover:bg-primary-foreground/10 transition-colors">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

