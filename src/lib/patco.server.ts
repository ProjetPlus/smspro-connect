/**
 * Patco — assistant virtuel SMS Pro Mobile.
 * Toute la logique serveur : connaissance de la plateforme, mémoire, appel IA.
 */

type Msg = { role: "user" | "assistant"; content: string };

export type LeadInfo = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  interest?: string | null;
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

/** Contexte plateforme (données réelles) + base de connaissances éditable. */
export async function buildKnowledge(supabaseAdmin: any): Promise<string> {
  const [packages, tiers, knowledge] = await Promise.all([
    supabaseAdmin.from("packages").select("name, price_fcfa, sms_volume, features").eq("active", true).order("sort_order"),
    supabaseAdmin.from("pricing_tiers").select("label, min_sms, max_sms, unit_price_fcfa").eq("active", true).order("sort_order"),
    supabaseAdmin.from("assistant_knowledge").select("title, content, category").eq("active", true).order("updated_at", { ascending: false }).limit(80),
  ]);

  const packLines = (packages.data ?? [])
    .map((p: any) => `- ${p.name} : ${Number(p.price_fcfa).toLocaleString("fr-FR")} FCFA pour ${p.sms_volume} SMS`)
    .join("\n");
  const tierLines = (tiers.data ?? [])
    .map((t: any) => `- ${t.label} : ${t.min_sms}${t.max_sms ? `–${t.max_sms}` : "+"} SMS à ${t.unit_price_fcfa} FCFA/SMS`)
    .join("\n");
  const kbLines = (knowledge.data ?? [])
    .map((k: any) => `### ${k.title} (${k.category})\n${k.content}`)
    .join("\n\n");

  return `
## La plateforme SMS Pro Mobile
Plateforme d'envoi de SMS professionnels en Côte d'Ivoire et dans la CEDEAO (éditeur : NM Technologie).
Contacts : téléphone et WhatsApp +225 07 07 17 37 07, e-mail infos@smspromobile.com, agence à Cocody Angré-Mahou (Abidjan).

Parcours client :
1. Création de compte sur /inscription (identité, e-mail, mot de passe, pays CEDEAO, ville, téléphone).
2. Validation du numéro par code SMS (secours par e-mail).
3. Dossier de vérification (KYC) dans l'espace client : type de client, structure, nom d'expéditeur (sender ID), pièces justificatives.
4. Achat d'un pack SMS — obligatoire pour faire valider le dossier.
5. Validation par l'administration : le nom d'expéditeur est activé et les envois deviennent possibles.

Espace client : assistant de création de campagne (type, contenu, variables, aperçu, validation), programmation des envois (date/heure, fuseau, récurrence, envoi test), suivi des campagnes (historique, statuts, rapports, export CSV/PDF), modèles de messages, clés API, commandes.

## Packs disponibles
${packLines || "(à préciser avec l'équipe commerciale)"}

## Paliers tarifaires
${tierLines || "(à préciser avec l'équipe commerciale)"}

## Base de connaissances interne
${kbLines || "(vide pour le moment)"}
`.trim();
}

function systemPrompt(knowledge: string, lead: LeadInfo | null) {
  const known = lead
    ? `Informations déjà connues sur cette personne : ${JSON.stringify(lead)}. Ne redemande jamais une information déjà connue.`
    : "Tu ne connais encore rien de cette personne.";

  return `Tu es **Patco**, l'assistant virtuel officiel de SMS Pro Mobile. Tu réponds en français, avec chaleur, clarté et concision (3 à 6 phrases max, listes courtes si utile).

Tes missions :
1. Renseigner les visiteurs sur la plateforme, les tarifs, l'inscription, le KYC, les campagnes et l'API, en t'appuyant UNIQUEMENT sur les informations ci-dessous. Si tu ne sais pas, dis-le et propose le contact humain (+225 07 07 17 37 07 / infos@smspromobile.com).
2. Au fil de la conversation, de façon naturelle et non insistante (une seule question à la fois), recueillir le nom et prénom, l'e-mail, le numéro de téléphone, le pays/la ville et le besoin de la personne, afin que l'équipe puisse la rappeler.
3. Encourager la création de compte sur /inscription et l'achat d'un pack quand c'est pertinent.

${known}

À la toute fin de CHAQUE réponse, ajoute une balise technique invisible pour l'utilisateur contenant les informations personnelles nouvellement apprises, au format exact :
<lead>{"full_name":null,"email":null,"phone":null,"country":null,"city":null,"interest":null}</lead>
Mets à null tout champ non connu. N'écris jamais cette balise autrement, et ne la commente pas.

# Connaissances
${knowledge}`;
}

/** Appelle la passerelle IA (Responses API, en flux) et renvoie le texte complet. */
async function callGateway(apiKey: string, input: any[]): Promise<string> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Patco reçoit beaucoup de demandes. Merci de réessayer dans un instant.");
    if (res.status === 402) throw new Error("Le service d'assistance est momentanément indisponible (crédits IA épuisés).");
    throw new Error(`Assistant indisponible (${res.status}). ${body.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Réponse vide de l'assistant.");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
        else if (evt.type === "response.completed" && !text && evt.response?.output_text) text += evt.response.output_text;
      } catch {
        /* fragment non JSON : ignoré */
      }
    }
  }
  return text;
}

/** Sépare la réponse visible des informations de contact extraites. */
function splitLead(raw: string): { reply: string; lead: LeadInfo } {
  const match = raw.match(/<lead>([\s\S]*?)<\/lead>/i);
  let lead: LeadInfo = {};
  if (match) {
    try {
      lead = JSON.parse(match[1]!.trim());
    } catch {
      lead = {};
    }
  }
  const reply = raw.replace(/<lead>[\s\S]*?<\/lead>/gi, "").trim();
  return { reply, lead };
}

export async function askPatco(params: {
  supabaseAdmin: any;
  apiKey: string;
  history: Msg[];
  message: string;
  lead: LeadInfo | null;
}): Promise<{ reply: string; lead: LeadInfo }> {
  const knowledge = await buildKnowledge(params.supabaseAdmin);
  const input = [
    { role: "system", content: [{ type: "input_text", text: systemPrompt(knowledge, params.lead) }] },
    ...params.history.slice(-16).map((m) => ({
      role: m.role,
      content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
    })),
    { role: "user", content: [{ type: "input_text", text: params.message }] },
  ];

  const raw = await callGateway(params.apiKey, input);
  const { reply, lead } = splitLead(raw);
  return {
    reply: reply || "Je n'ai pas pu formuler de réponse. Reformulez votre question ou appelez-nous au +225 07 07 17 37 07.",
    lead,
  };
}

/** Nettoie et fusionne les informations de contact apprises. */
export function mergeLead(current: any, learned: LeadInfo) {
  const clean = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s && s.toLowerCase() !== "null" ? s.slice(0, 200) : null;
  };
  const patch: Record<string, string> = {};
  for (const key of ["full_name", "email", "phone", "country", "city", "interest"] as const) {
    const value = clean(learned[key]);
    if (value && !current?.[key]) patch[key] = value;
  }
  return patch;
}
