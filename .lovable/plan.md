# Corriger la production et livrer SMS Mobile Pro V1.1

## Objectif
Rétablir immédiatement les images, Patco et les e-mails sur `smspromobile.com`, puis compléter l’évolution V1.1 décrite dans le cahier des charges sans supprimer les fonctions existantes.

## 1. Correctifs urgents de production
- Remplacer l’adresse temporaire de l’avatar Patco par un vrai fichier intégré au site, avec une solution de repli si l’image ne charge pas.
- Vérifier tous les logos et images visibles sur ordinateur et mobile, puis corriger les références cassées et le chargement tardif du carrousel partenaires.
- Rendre Patco résilient : message d’erreur clair, délai maximal, réponse de secours utile et journalisation serveur exploitable.
- Vérifier la configuration de production nécessaire à Patco et aux e-mails, sans exposer les clés dans le navigateur ou le chat.
- Tester Brevo avec un e-mail réel vers `admin@smspromobile.com`, puis relancer la file d’attente existante et enregistrer le résultat de chaque tentative.

## 2. Patco partout
- Conserver le bouton flottant sur toutes les pages publiques, l’inscription, la connexion, l’espace client et l’administration.
- Corriger son affichage face aux fenêtres de consentement et sur petit écran.
- Conserver l’historique de conversation et la mémoire des informations utiles déjà autorisées.
- Ajouter des réponses de secours sur les tarifs, l’inscription, le KYC, les campagnes et les contacts lorsque l’intelligence artificielle est indisponible.

## 3. SMS Studio V1.1
- Remplacer l’ancien formulaire simplifié par l’assistant déjà amorcé, sans perdre les campagnes existantes.
- Ajouter les familles demandées : marketing, e-commerce, événement, spectacle, média, interaction et campagne libre.
- Ajouter le choix entre modèles recommandés, modèles personnels et création sans modèle.
- Compléter l’éditeur : variables, compteur de caractères et segments SMS, aperçu téléphone, coût estimé, destinataires, envoi test, date/heure, fuseau, récurrence et confirmation finale.
- Ajouter l’entrée « Créer avec l’IA » avec un parcours visuel simulé conforme à la phase UI du cahier.

## 4. Navigation et espaces V1.1
- Étendre la navigation actuelle sans créer une seconde navigation concurrente.
- Ajouter les vues prévues pour SMS Studio, automatisations, événements, SMS interactif, audiences, statistiques et paramètres.
- Précharger des exemples réalistes pour les modèles, scénarios, événements, votes, quiz, jeux, sondages, prédictions et médias.
- Étendre l’administration avec les écrans visuels correspondants : modèles, catégories, mots-clés, routes SMS simulées et journal d’activité.

## 5. Suivi des campagnes
- Conserver programmation, statuts en direct, historique et rapports.
- Relier le nouvel assistant de création aux campagnes existantes.
- Vérifier les filtres, brouillons, programmées, récurrentes, envoyées, duplication et suppression.
- Vérifier les exports CSV et PDF et améliorer les états vide, chargement, réussite, erreur et confirmation.

## 6. Validation
- Vérifier les pages sur ordinateur et mobile, notamment les images, menus, formulaires, tableaux et bouton Patco.
- Tester une réponse Patco sur le site exécuté.
- Tester l’acceptation d’un e-mail par Brevo et la reprise des cinq e-mails actuellement en attente.
- Vérifier la compilation et les erreurs visibles avant livraison.

## Détails techniques
- Les nouveaux écrans V1.1 resteront principalement visuels et utiliseront des données réalistes simulées, conformément au cahier des charges.
- Les fonctions déjà réelles (comptes, KYC, campagnes, rapports, paiements, Patco et e-mails) restent conservées et sécurisées.
- La clé Brevo reste un secret serveur. Elle ne sera ni affichée ni envoyée dans le chat.
- La confirmation finale garantit l’acceptation par Brevo ; la présence exacte dans une boîte de réception dépend ensuite du fournisseur de messagerie.
