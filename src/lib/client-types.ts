// Moteur de documents conditionnels — SMS Pro Mobile
export type DocSpec = { key: string; label: string; required: boolean };

export const CLIENT_TYPES = [
  "Entreprise / Société",
  "Association",
  "ONG / Organisation",
  "Organisation religieuse",
  "Groupement / Coopérative",
  "Établissement / Institution",
  "Profession libérale",
  "Activité individuelle / Entrepreneur individuel",
  "Administration / Organisme public",
  "Établissement scolaire / universitaire",
  "Média",
  "Autre",
] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];

const RESIDENCE: DocSpec = {
  key: "residence",
  label: "Justificatif de résidence du responsable (certificat, facture CIE/SODECI)",
  required: false,
};

const STRUCTURE_DOCS: Record<ClientType, DocSpec[]> = {
  "Entreprise / Société": [
    { key: "rccm", label: "RCCM", required: true },
    { key: "statuts", label: "Statuts", required: true },
    { key: "dfe", label: "DFE (Déclaration Fiscale d'Existence)", required: true },
    { key: "bail", label: "Contrat de bail / justificatif du siège", required: false },
  ],
  Association: [
    { key: "recepisse", label: "Récépissé de déclaration / existence légale", required: true },
    { key: "statuts", label: "Statuts de l'association", required: true },
    { key: "designation", label: "Document désignant le responsable (PV, mandat)", required: false },
  ],
  "ONG / Organisation": [
    { key: "agrement", label: "Agrément / preuve d'existence légale", required: true },
    { key: "statuts", label: "Statuts ou acte constitutif", required: true },
    { key: "designation", label: "Document attestant la qualité du responsable", required: false },
  ],
  "Organisation religieuse": [
    { key: "reconnaissance", label: "Déclaration / reconnaissance officielle", required: true },
    { key: "statuts", label: "Statuts ou document constitutif", required: true },
    { key: "designation", label: "Document attestant la qualité du responsable", required: false },
  ],
  "Groupement / Coopérative": [
    { key: "immatriculation", label: "Immatriculation / reconnaissance du groupement", required: true },
    { key: "statuts", label: "Statuts", required: true },
    { key: "designation", label: "Document identifiant le responsable", required: false },
  ],
  "Établissement / Institution": [
    { key: "existence", label: "Document attestant l'existence de l'établissement", required: true },
    { key: "designation", label: "Document identifiant le responsable", required: false },
  ],
  "Profession libérale": [
    { key: "inscription", label: "Inscription / autorisation professionnelle (ordre, agrément)", required: true },
    { key: "activite", label: "Justificatif d'activité (facture, attestation)", required: false },
  ],
  "Activité individuelle / Entrepreneur individuel": [
    { key: "rccm", label: "RCCM ou déclaration d'activité", required: true },
    { key: "dfe", label: "DFE, si applicable", required: false },
  ],
  "Administration / Organisme public": [
    { key: "existence", label: "Document officiel attestant l'organisme", required: true },
    { key: "autorisation", label: "Autorisation / note de service du représentant", required: true },
  ],
  "Établissement scolaire / universitaire": [
    { key: "autorisation", label: "Autorisation d'ouverture / arrêté de création", required: true },
    { key: "designation", label: "Document identifiant le responsable", required: false },
  ],
  Média: [
    { key: "existence", label: "Autorisation / récépissé d'existence du média", required: true },
    { key: "designation", label: "Document attestant la qualité du responsable", required: false },
  ],
  Autre: [
    { key: "existence", label: "Document justifiant l'existence légale du client", required: true },
  ],
};

export function structureDocs(type: string): DocSpec[] {
  return STRUCTURE_DOCS[type as ClientType] ?? STRUCTURE_DOCS["Autre"];
}

export function representativeDocs(idType: string): DocSpec[] {
  if (idType === "Passeport") {
    return [{ key: "passport", label: "Passeport — page d'identité", required: true }, RESIDENCE];
  }
  if (idType === "Permis de conduire") {
    return [
      { key: "permis_recto", label: "Permis de conduire — recto", required: true },
      { key: "permis_verso", label: "Permis de conduire — verso", required: false },
      RESIDENCE,
    ];
  }
  return [
    { key: "cni_recto", label: "CNI — recto", required: true },
    { key: "cni_verso", label: "CNI — verso", required: true },
    RESIDENCE,
  ];
}

export const ID_TYPES = ["CNI", "Passeport", "Permis de conduire"] as const;

export const PRICING_TIERS = [
  { range: "200 à 999 SMS", price: "25 FCFA / SMS" },
  { range: "1 000 à 9 999 SMS", price: "20 FCFA / SMS" },
  { range: "10 000 à 99 999 SMS", price: "15 FCFA / SMS" },
  { range: "100 000 SMS et plus", price: "12 FCFA / SMS" },
];

export const COUNTRIES = [
  "Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso", "Bénin", "Togo", "Niger",
  "Guinée-Bissau", "Guinée", "Ghana", "Cameroun", "Autre",
];
