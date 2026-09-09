import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";

export const Route = createFileRoute("/documentation")({
  component: DocumentationPage,
  head: () => ({
    meta: [
      { title: "Documentation API SMS — SMS Pro Mobile" },
      {
        name: "description",
        content:
          "Documentation technique de l'API SMS Pro Mobile : authentification par clé API, envoi de SMS, webhooks de statut et exemples PHP, Python, Node.js, Java, C#, WinDev.",
      },
      { property: "og:title", content: "Documentation API SMS — SMS Pro Mobile" },
      {
        property: "og:description",
        content: "Intégrez l'envoi de SMS dans votre application en quelques lignes de code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SNIPPETS: { lang: string; code: string }[] = [
  {
    lang: "cURL",
    code: `curl -X POST https://www.smsmobilepro.com/api/public/v1/sms \\
  -H "Authorization: Bearer smspm_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{"to":["+2250700000000"],"message":"Bonjour","sender_id":"MASOCIETE"}'`,
  },
  {
    lang: "PHP",
    code: `$ch = curl_init("https://www.smsmobilepro.com/api/public/v1/sms");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer smspm_votre_cle",
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "to" => ["+2250700000000"],
    "message" => "Bonjour",
    "sender_id" => "MASOCIETE",
  ]),
]);
$response = curl_exec($ch);`,
  },
  {
    lang: "Python",
    code: `import requests

requests.post(
    "https://www.smsmobilepro.com/api/public/v1/sms",
    headers={"Authorization": "Bearer smspm_votre_cle"},
    json={"to": ["+2250700000000"], "message": "Bonjour", "sender_id": "MASOCIETE"},
    timeout=30,
)`,
  },
  {
    lang: "Node.js",
    code: `await fetch("https://www.smsmobilepro.com/api/public/v1/sms", {
  method: "POST",
  headers: {
    Authorization: "Bearer smspm_votre_cle",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: ["+2250700000000"],
    message: "Bonjour",
    sender_id: "MASOCIETE",
  }),
});`,
  },
  {
    lang: "Java",
    code: `HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://www.smsmobilepro.com/api/public/v1/sms"))
    .header("Authorization", "Bearer smspm_votre_cle")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\\"to\\":[\\"+2250700000000\\"],\\"message\\":\\"Bonjour\\",\\"sender_id\\":\\"MASOCIETE\\"}"))
    .build();
HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());`,
  },
  {
    lang: "C#",
    code: `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer smspm_votre_cle");
var body = new StringContent(
    "{\\"to\\":[\\"+2250700000000\\"],\\"message\\":\\"Bonjour\\",\\"sender_id\\":\\"MASOCIETE\\"}",
    Encoding.UTF8, "application/json");
await client.PostAsync("https://www.smsmobilepro.com/api/public/v1/sms", body);`,
  },
  {
    lang: "WinDev",
    code: `req est un restRequête
req.Méthode = httpPost
req.URL = "https://www.smsmobilepro.com/api/public/v1/sms"
req.Entête["Authorization"] = "Bearer smspm_votre_cle"
req.Entête["Content-Type"] = "application/json"
req.Contenu = '{"to":["+2250700000000"],"message":"Bonjour","sender_id":"MASOCIETE"}'
rep est un restRéponse = RESTEnvoie(req)`,
  },
];

const FIELDS = [
  { name: "to", type: "string[]", req: "oui", desc: "Numéros au format E.164 (ex. +2250700000000)." },
  { name: "message", type: "string", req: "oui", desc: "Contenu du SMS (160 caractères par segment GSM-7)." },
  { name: "sender_id", type: "string", req: "non", desc: "Nom d'expéditeur validé pour votre compte." },
  { name: "scheduled_at", type: "ISO 8601", req: "non", desc: "Date d'envoi programmé (UTC)." },
  { name: "reference", type: "string", req: "non", desc: "Votre identifiant interne, renvoyé dans le webhook." },
];

const STATUSES = [
  { code: "queued", desc: "Message accepté et placé en file d'envoi." },
  { code: "sent", desc: "Message remis à l'opérateur." },
  { code: "delivered", desc: "Accusé de réception confirmé par le mobile." },
  { code: "failed", desc: "Échec définitif (numéro invalide, opérateur injoignable...)." },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-foreground text-background rounded-sm p-4 text-xs leading-relaxed">
      {children}
    </pre>
  );
}

function DocumentationPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Documentation technique"
        title="API SMS Pro Mobile"
        description="Une API REST unique pour envoyer des SMS transactionnels et marketing dans toute la zone CEDEAO, avec accusés de réception en temps réel."
      />

      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl space-y-12">
          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Authentification</h2>
            <p className="text-sm text-foreground/60 mt-3 max-w-2xl">
              Chaque requête doit porter une clé API générée depuis le tableau de bord, section{" "}
              <Link to="/dashboard/api-keys" className="text-primary font-semibold">
                Clés API
              </Link>
              . Les clés sont révocables et le HTTPS est obligatoire.
            </p>
            <div className="mt-4">
              <Code>{`Authorization: Bearer smspm_votre_cle`}</Code>
            </div>
          </div>

          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Envoyer un SMS</h2>
            <p className="text-sm text-foreground/60 mt-3">
              <span className="font-mono text-primary">POST</span> /api/public/v1/sms
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3 font-mono text-[10px] uppercase tracking-widest">Champ</th>
                    <th className="p-3 font-mono text-[10px] uppercase tracking-widest">Type</th>
                    <th className="p-3 font-mono text-[10px] uppercase tracking-widest">Requis</th>
                    <th className="p-3 font-mono text-[10px] uppercase tracking-widest">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map((f) => (
                    <tr key={f.name} className="border-t border-border">
                      <td className="p-3 font-mono text-primary">{f.name}</td>
                      <td className="p-3 font-mono text-xs text-foreground/60">{f.type}</td>
                      <td className="p-3 text-xs">{f.req}</td>
                      <td className="p-3 text-foreground/70">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Exemples par langage</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {SNIPPETS.map((s) => (
                <div key={s.lang}>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                    {s.lang}
                  </div>
                  <Code>{s.code}</Code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl">Webhook de statut</h2>
            <p className="text-sm text-foreground/60 mt-3 max-w-2xl">
              Renseignez une URL de callback dans vos paramètres : chaque changement d'état est poussé en{" "}
              <span className="font-mono">POST</span> JSON.
            </p>
            <div className="mt-4">
              <Code>{`{
  "message_id": "5f2c...",
  "reference": "cmd-10245",
  "to": "+2250700000000",
  "status": "delivered",
  "updated_at": "2026-08-21T09:12:04Z"
}`}</Code>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {STATUSES.map((s) => (
                <li key={s.code} className="border border-border rounded-sm p-4">
                  <span className="font-mono text-primary text-sm">{s.code}</span>
                  <p className="text-sm text-foreground/60 mt-1">{s.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border rounded-sm p-6 bg-muted">
            <h2 className="font-display font-bold text-xl">Besoin d'aide pour intégrer ?</h2>
            <p className="text-sm text-foreground/60 mt-2">
              Notre équipe technique accompagne votre intégration PHP, WinDev, ERP ou mobile.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link
                to="/contact"
                className="px-5 py-3 bg-primary text-primary-foreground rounded-sm text-sm font-semibold"
              >
                Contacter le support
              </Link>
              <Link to="/developpeurs" className="px-5 py-3 border border-border rounded-sm text-sm font-semibold">
                Espace développeurs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
