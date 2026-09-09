# Inscription simplifiée, KYC après compte, e-mails automatiques

## 1. La cause du message d'erreur rouge

La clé technique qui permet au serveur de créer les comptes n'était plus reliée au projet.
Elle vient d'être rebranchée. Le formulaire ne pourra plus afficher ce message : si jamais
un service est indisponible, l'utilisateur verra un message clair en français, jamais un
message technique.

## 2. Nouvelle création de compte (une seule étape)

Champs : nom, prénom, e-mail, mot de passe, indicatif + numéro, pays, ville.

- Le pays est une liste déroulante des 15 pays de la CEDEAO, Côte d'Ivoire par défaut.
- L'indicatif est une liste séparée avec drapeau et code (🇨🇮 +225 par défaut), synchronisée
  avec le pays choisi.
- Un clic sur « Créer mon compte » suffit.

Ensuite : un code à 6 chiffres est envoyé par SMS au numéro saisi ; l'utilisateur le saisit
et accède au tableau de bord. Si aucun opérateur SMS n'est joignable, le code part par
e-mail automatiquement pour ne jamais bloquer une inscription.

## 3. KYC déplacé après la création du compte

Le tableau de bord est accessible mais les envois restent bloqués tant que le dossier n'est
pas validé. Un parcours « Vérification de mon compte » reprend exactement les étapes
actuelles : type de client / statut, nom de la structure, nom d'expéditeur (sender ID),
documents selon le statut, pièce d'identité et fonction, vérification, envoi.

Après l'envoi : message de confirmation précisant qu'il faut **acheter un pack pour faire
valider la demande**, puis ouverture automatique de la page de choix du pack, puis paiement.

## 4. Côté administration

- Le dossier arrive dans l'espace admin avec l'indication « pack payé / non payé ».
- Le bouton « Valider » active le compte ; le nom d'expéditeur devient actif.
- Tant que ce n'est pas validé, le sender ID s'affiche grisé côté client.

## 5. Bandeau cookies

Le consentement sera enregistré de façon persistante (cookie propre + stockage local) : il
n'apparaîtra plus qu'une seule fois, et jamais à chaque rafraîchissement.

## 6. E-mails automatiques (Brevo)

Envoi via Brevo à chaque étape : bienvenue, code de vérification (secours), dossier reçu,
rappel « pack à payer », paiement confirmé, compte validé, compte refusé, plus la
notification à l'administrateur. La clé Brevo sera demandée dans un formulaire sécurisé.

## Détails techniques

- Base : ajout des colonnes `country`, `city`, `dial_code`, `phone_e164`,
  `phone_verified_at`, `account_status` sur `profiles` ; nouvelle table
  `phone_verifications` (code haché, expiration, tentatives, RLS service_role) ; colonnes
  `paid_at` / `payment_order_id` sur `signup_applications` ; champs KYC rendus optionnels à
  la création du compte.
- Nouvelles fonctions serveur : `signup-account` simplifiée, `phone-otp.functions`
  (envoi/vérification), `kyc.functions` (soumission), `emails.server` (Brevo).
- Nouvelle route `/_authenticated/verification` (KYC) ; `/inscription` réduite à l'étape 1
  + saisie du code.
- Garde côté serveur : aucune campagne envoyable sans dossier approuvé.
