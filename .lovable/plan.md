# SMSMobile Pro — site vitrine

Plateforme d'envoi de SMS (marketing, transactionnel, API) pour la Côte d'Ivoire et l'Afrique de l'Ouest. Même périmètre fonctionnel que le site de référence, mais identité visuelle, textes et visuels entièrement originaux.

## Pages

1. **Accueil** — accroche « Vos messages arrivent, en 3 secondes », chiffres clés (SMS envoyés, taux de livraison, clients, latence), aperçu des 3 canaux, extrait tarifs, étapes de démarrage, témoignages, FAQ courte, appel à l'action.
2. **Solutions** — SMS marketing ciblé, SMS enrichi (liens courts trackables), SMS transactionnel/OTP, API & webhooks, plus une grille « cas d'usage » par secteur (e-commerce, fintech, santé, éducation, événementiel, immobilier, ONG, logistique).
3. **Tarifs** — 4 packs prépayés + grille dégressive au volume, mention paiement Mobile Money, FAQ tarifaire.
4. **Plateforme** — les fonctionnalités du tableau de bord : éditeur de campagne, contacts & segments, statistiques, Sender ID personnalisé, sécurité, support local.
5. **Contact** — formulaire (nom, société, e-mail, téléphone, message) + coordonnées et horaires.
6. **FAQ** — version complète des questions fréquentes.

En-tête commun avec navigation et bouton « Créer un compte », pied de page avec liens et mentions.

## Contenu et visuels

- Tous les textes sont réécrits en français, ton propre à SMSMobile Pro. Aucun copier-coller du site de référence.
- Les tarifs et statistiques repris comme ordres de grandeur du marché : à confirmer avec vos vrais chiffres.
- Témoignages et logos clients : présentés comme exemples fictifs tant que vous ne fournissez pas de vraies références.
- Images (visuel d'accueil, illustrations de sections) générées spécifiquement pour le projet.

## Identité visuelle

Direction distincte du site de référence : palette chaude ocre/terracotta avec un vert profond de contraste, typographie affirmée pour les titres et sans-serif lisible pour le texte, angles nets et cartes sobres. Je proposerai la direction retenue à l'écran ; ajustable après coup.

## Détails techniques

- TanStack Start, une route par page sous `src/routes/`, métadonnées `head()` propres à chaque page (titre, description, partage social).
- Jetons de couleur/typographie définis dans `src/styles.css` (Tailwind v4 `@theme`), composants shadcn adaptés.
- Formulaire de contact en validation côté client uniquement à cette étape : aucun envoi réel d'e-mail tant qu'un backend n'est pas activé.

## Hors périmètre pour l'instant

Comptes utilisateurs, tableau de bord réel, envoi de SMS, paiement Mobile Money. Ce sont des fonctions serveur à ajouter dans un second temps si vous le souhaitez.
