import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-chrome";

export const Route = createFileRoute("/developpeurs")({
  component: DevelopersPage,
  head: () => ({
    meta: [
      { title: "Espace développeurs — API SMS Pro Mobile" },
      {
        name: "description",
        content:
          "API SMS REST pour développeurs : envoi transactionnel, campagnes, accusés de réception, webhooks et SDK PHP, Java, Python, Node.js, WinDev, C#.",
      },
      { property: "og:title", content: "Espace développeurs — API SMS Pro Mobile" },
      { property: "og:description", content: "Intégrez l'envoi de SMS dans votre site, ERP ou application en quelques lignes de code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const FEATURES = [
  { title: "API REST unique", text: "Un seul endpoint HTTPS pour l'envoi unitaire ou en masse, authentifié par clé API." },
  { title: "Accusés de réception", text: "Webhook de statut (queued, sent, delivered, failed) poussé vers votre URL." },
  { title: "Campagnes programmées", text: "Planification, récurrence quotidienne, hebdomadaire ou mensuelle." },
  { title: "Multi-langages", text: "Exemples prêts à l'emploi en PHP, Java, Python, Node.js, C#, WinDev et cURL." },
  { title: "Zone CEDEAO", text: "Numéros normalisés E.164 et routage vers tous les opérateurs de la sous-région." },
  { title: "Sécurité", text: "Clés API révocables, HTTPS obligatoire, journal d'utilisation par clé." },
];

const STEPS = [
  "Créez votre compte professionnel et faites valider votre dossier.",
  "Générez une clé API depuis le tableau de bord (Clés API).",
  "Envoyez votre premier SMS via l'endpoint /api/public/v1/sms.",
  "Branchez le webhook de statut pour suivre chaque message.",
];

function DevelopersPage() {
  return (
    <SiteLayout>
      <section className="px-4 sm:px-8 py-12 sm:py-20 border-b border-border">
        <div className="mx-auto max-w-5xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Développeurs</div>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl mt-2 max-w-3xl">
            Automatisez vos SMS depuis votre propre plateforme
          </h1>
          <p className="text-foreground/60 mt-4 max-w-2xl">
            Intégrez SMS Pro Mobile dans votre site web, votre ERP, votre application mobile ou votre logiciel
            WinDev. Déclenchez des messages automatiquement selon vos règles métier : confirmation de commande,
            rappel d'échéance, code de vérification, alerte interne.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/documentation" className="px-5 py-3 bg-primary text-primary-foreground rounded-sm text-sm font-semibold">
              Lire la documentation
            </Link>
            <Link to="/inscription" className="px-5 py-3 border border-border rounded-sm text-sm font-semibold">
              Obtenir une clé API
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-border rounded-sm p-5 bg-background">
              <h2 className="font-display font-bold text-lg">{f.title}</h2>
              <p className="text-sm text-foreground/60 mt-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 sm:py-16 bg-muted border-y border-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Démarrer en 4 étapes</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3 bg-background border border-border rounded-sm p-4">
                <span className="font-mono text-primary font-bold">{i + 1}</span>
                <span className="text-sm text-foreground/70">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Votre premier envoi</h2>
          <pre className="mt-5 overflow-x-auto bg-foreground text-background rounded-sm p-4 text-xs leading-relaxed">
{`curl -X POST https://www.smsmobilepro.com/api/public/v1/sms \\
  -H "Authorization: Bearer smspm_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": ["+2250700000000"],
    "message": "Bonjour, votre commande est prête.",
    "sender_id": "MASOCIETE"
  }'`}
          </pre>
          <p className="text-sm text-foreground/60 mt-4">
            Exemples complets en PHP, Java, Python, Node.js, C# et WinDev dans la{" "}
            <Link to="/documentation" className="text-primary font-semibold">documentation technique</Link>.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
