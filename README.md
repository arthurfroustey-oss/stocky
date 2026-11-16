# Stocky

Gestion de stock et de péremption pour cuisines de restaurant. Application monopage (SPA) **sans backend** : toutes les données sont stockées dans le `localStorage` du navigateur (clé versionnée `stocky_v1`).

## Démarrage

```bash
npm install       # installer les dépendances
npm run dev       # lancer en local (http://localhost:5173)
```

Autres commandes :

```bash
npm run build     # build de production (dossier dist/)
npm run preview   # prévisualiser le build (http://localhost:4173)
npm run typecheck # vérification TypeScript
```

## Fonctionnalités

- **Tableau de bord** : compteurs d'alertes (périme aujourd'hui / 48 h / déjà périmés), liste FIFO « à utiliser en priorité », actions rapides « Utilisé » / « Jeté ».
- **Stock** : recherche, filtres en pastilles, tri, ajout rapide avec valeurs par défaut par catégorie, boutons J+1 à J+7.
- **Mises en place** : cartes « étiquette » avec compte à rebours, auteur, impression d'étiquette 60 × 40 mm.
- **Menu de la semaine** : planning midi/soir de la semaine suivante, fiche recette par couvert, **génération automatique de la commande** (déduction du stock encore valide à la date d'utilisation, FIFO, arrondi pratique, regroupement par fournisseur).
- **Commande** : panier par fournisseur, envoi `mailto:`, historique, réception avec photo du bon de livraison → alimente le stock.
- **Scan** : code-barres via l'API `BarcodeDetector` (repli ZXing), saisie manuelle, pré-remplissage du formulaire pour les codes connus.
- **Statistiques** : pertes en €, taux de gaspillage, produits sauvés, graphiques (courbe hebdo, barres par catégorie, top 5).
- **Paramètres** : nom du restaurant, délai d'alerte, gestion des listes (lieux, catégories, unités), réinitialisation des données de démo.
- **Notifications** : centre de notifications (cloche), génération automatique toutes les minutes, notifications navigateur sur demande explicite.

## Notes

- Conçue « tablette d'abord » (paysage 1024–1366 px), adaptée au mobile (< 768 px) et au grand écran (> 1366 px).
- Interface 100 % en français, dates JJ/MM/AAAA, montants `Intl.NumberFormat` fr-FR.
- Au premier lancement, des données de démo (restaurant bistronomique bordelais, ~49 produits, 5 fournisseurs, 10 plats) sont chargées ; tout est réinitialisable depuis les Paramètres.
- La caméra du scan nécessite HTTPS ou localhost.
