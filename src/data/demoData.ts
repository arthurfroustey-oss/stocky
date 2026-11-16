import type { DB, Produit, Fournisseur, MiseEnPlace, Plat, Commande, HistoriquePerte, ServiceRepas } from '../types'
import { ajouterJours, aujourdhuiISO, lundiDeLaSemaine, dateVersISO } from '../lib/dates'

// Données de démo : restaurant bistronomique à Bordeaux.
// Toutes les dates sont calculées par rapport à la date du jour pour rester cohérentes.

export const FOURNISSEURS: Fournisseur[] = [
  {
    id: 'f1',
    nom: 'Boucherie Dubourg',
    categorie: 'boucherie',
    contact: 'Marc Dubourg',
    telephone: '0556912345',
    email: 'commande@boucherie-dubourg.fr',
    joursLivraison: [2, 5], // mercredi, samedi
    delaiLivraison: 1,
  },
  {
    id: 'f2',
    nom: "Marée de l'Océan",
    categorie: 'marée',
    contact: 'Sylvie Marion',
    telephone: '0556778899',
    email: 'contact@maree-ocean.fr',
    joursLivraison: [1, 4], // mardi, vendredi
    delaiLivraison: 1,
  },
  {
    id: 'f3',
    nom: 'Primeur des Quais',
    categorie: 'primeur',
    contact: 'Nabil Benali',
    telephone: '0556445566',
    email: 'livraison@primeur-quais.fr',
    joursLivraison: [1, 3, 5], // mardi, jeudi, samedi
    delaiLivraison: 0,
  },
  {
    id: 'f4',
    nom: 'Crèmerie du Bordelais',
    categorie: 'crèmerie',
    contact: 'Claire Fontan',
    telephone: '0556332211',
    email: 'commandes@cremerie-bordelais.fr',
    joursLivraison: [2, 5],
    delaiLivraison: 1,
  },
  {
    id: 'f5',
    nom: 'Épicerie du Sud-Ouest',
    categorie: 'épicerie',
    contact: 'Julien Roques',
    telephone: '0556229988',
    email: 'ventes@epicerie-sudouest.fr',
    joursLivraison: [3], // jeudi
    delaiLivraison: 2,
  },
]

// [nom, catégorie, quantité, unité, lieu, fournisseur, écart DLC en jours, prix unitaire, code-barres ?]
type LigneProduit = [string, string, number, string, string, string, number, number, string?]

const LIGNES: LigneProduit[] = [
  // Viandes (boucherie)
  ['Entrecôte', 'Viandes', 6.5, 'kg', 'Chambre froide positive', 'f1', 4, 28.9],
  ['Épaule de veau', 'Viandes', 3.2, 'kg', 'Chambre froide positive', 'f1', 2, 19.5],
  ['Magret de canard', 'Viandes', 12, 'pièce', 'Chambre froide positive', 'f1', 5, 7.4],
  ['Cuisses de canard', 'Viandes', 8, 'pièce', 'Chambre froide positive', 'f1', 3, 4.2],
  ['Épaule d’agneau', 'Viandes', 2.8, 'kg', 'Chambre froide positive', 'f1', 6, 22.4],
  ['Côte de porc', 'Viandes', 4.5, 'kg', 'Chambre froide positive', 'f1', 8, 12.8],
  ['Poulet fermier', 'Viandes', 4, 'pièce', 'Chambre froide positive', 'f1', 1, 11.6],
  ['Filet de bœuf', 'Viandes', 1.8, 'kg', 'Chambre froide positive', 'f1', -1, 42.0],
  ['Jambon blanc', 'Viandes', 1.5, 'kg', 'Chambre froide positive', 'f1', 10, 9.8],
  // Poissons (marée)
  ['Filet de bar', 'Poissons', 2.4, 'kg', 'Chambre froide négative', 'f2', 1, 26.5],
  ['Cabillaud', 'Poissons', 1.6, 'kg', 'Chambre froide négative', 'f2', 2, 21.9],
  ['Saumon', 'Poissons', 2.2, 'kg', 'Chambre froide négative', 'f2', 5, 19.8],
  ['Crevettes', 'Poissons', 1.2, 'kg', 'Chambre froide négative', 'f2', 0, 17.5],
  ['Moules', 'Poissons', 5, 'kg', 'Chambre froide négative', 'f2', -2, 3.9],
  ['Huîtres', 'Poissons', 36, 'pièce', 'Chambre froide négative', 'f2', 7, 1.1],
  // Fruits & légumes (primeur)
  ['Tomates', 'Fruits & légumes', 4, 'kg', 'Chambre froide positive', 'f3', 3, 3.6],
  ['Oignons', 'Fruits & légumes', 8, 'kg', 'Réserve sèche', 'f3', 12, 1.5],
  ['Échalotes', 'Fruits & légumes', 2, 'kg', 'Réserve sèche', 'f3', 15, 4.2],
  ['Pommes de terre', 'Fruits & légumes', 12, 'kg', 'Réserve sèche', 'f3', 20, 1.2],
  ['Carottes', 'Fruits & légumes', 6, 'kg', 'Chambre froide positive', 'f3', 2, 1.4],
  ['Poireaux', 'Fruits & légumes', 5, 'botte', 'Chambre froide positive', 'f3', 4, 2.1],
  ['Champignons de Paris', 'Fruits & légumes', 3, 'kg', 'Chambre froide positive', 'f3', 1, 5.4],
  ['Salade verte', 'Fruits & légumes', 6, 'pièce', 'Chambre froide positive', 'f3', 0, 1.3],
  ['Citrons', 'Fruits & légumes', 2, 'kg', 'Chambre froide positive', 'f3', 9, 2.8],
  ['Pommes', 'Fruits & légumes', 7, 'kg', 'Réserve sèche', 'f3', 14, 2.2],
  ['Persil', 'Fruits & légumes', 4, 'botte', 'Chambre froide positive', 'f3', 2, 1.6],
  ['Ail', 'Fruits & légumes', 0.8, 'kg', 'Réserve sèche', 'f3', 25, 6.5],
  // Produits laitiers (crèmerie)
  ['Beurre', 'Produits laitiers', 5, 'kg', 'Chambre froide positive', 'f4', 18, 9.2],
  ['Crème liquide', 'Produits laitiers', 6, 'L', 'Chambre froide positive', 'f4', 1, 4.8],
  ['Lait entier', 'Produits laitiers', 10, 'L', 'Chambre froide positive', 'f4', 7, 1.1],
  ['Œufs', 'Produits laitiers', 90, 'pièce', 'Chambre froide positive', 'f4', 12, 0.32],
  ['Parmesan', 'Produits laitiers', 1.2, 'kg', 'Chambre froide positive', 'f4', 30, 22.0],
  ['Comté', 'Produits laitiers', 1.5, 'kg', 'Chambre froide positive', 'f4', 21, 18.5],
  ['Gousse de vanille', 'Produits laitiers', 8, 'pièce', 'Réserve sèche', 'f4', 60, 3.5],
  // Épicerie (épicerie du Sud-Ouest)
  ['Farine', 'Épicerie', 10, 'kg', 'Réserve sèche', 'f5', 120, 1.1],
  ['Sucre', 'Épicerie', 8, 'kg', 'Réserve sèche', 'f5', 180, 1.0],
  ['Huile d’olive', 'Épicerie', 3, 'L', 'Réserve sèche', 'f5', 150, 8.9],
  ['Riz arborio', 'Épicerie', 6, 'kg', 'Réserve sèche', 'f5', 90, 3.4],
  ['Vin blanc de cuisine', 'Épicerie', 4, 'L', 'Réserve sèche', 'f5', 200, 3.2],
  ['Moutarde', 'Épicerie', 2, 'pièce', 'Réserve sèche', 'f5', 100, 2.4],
  ['Concentré de tomate', 'Épicerie', 6, 'pièce', 'Réserve sèche', 'f5', 80, 1.8],
  ['Fonds de veau déshydraté', 'Épicerie', 3, 'pièce', 'Réserve sèche', 'f5', 150, 6.2],
  // Surgelés
  ['Fruits rouges surgelés', 'Surgelés', 4, 'kg', 'Chambre froide négative', 'f5', 60, 7.8],
  ['Épinards surgelés', 'Surgelés', 3, 'kg', 'Chambre froide négative', 'f5', 75, 3.1],
  ['Glace vanille', 'Surgelés', 2, 'L', 'Chambre froide négative', 'f5', 45, 11.5],
  // Boissons
  ['Vin rouge Bordeaux', 'Boissons', 24, 'pièce', 'Cave', 'f5', 300, 6.8],
  ['Vin blanc sec', 'Boissons', 12, 'pièce', 'Cave', 'f5', 300, 6.2],
  ['Eau minérale', 'Boissons', 48, 'pièce', 'Réserve sèche', 'f5', 400, 0.45],
  ['Café en grains', 'Boissons', 2, 'kg', 'Réserve sèche', 'f5', 90, 14.5],
]

export function produitsDemo(): Produit[] {
  const t = aujourdhuiISO()
  return LIGNES.map((l, i) => ({
    id: `p${i + 1}`,
    nom: l[0],
    categorie: l[1],
    quantite: l[2],
    unite: l[3],
    lieu: l[4],
    fournisseurId: l[5],
    dateReception: ajouterJours(t, -2),
    datePeremption: ajouterJours(t, l[6]),
    prixUnitaire: l[7],
    codeBarres: l[8],
  }))
}

// 15 codes-barres fictifs reliés à des produits de démo
export function attribuerCodesBarres(produits: Produit[]): Produit[] {
  const cibles = ['Entrecôte', 'Magret de canard', 'Filet de bar', 'Cabillaud', 'Saumon', 'Moules',
    'Tomates', 'Oignons', 'Champignons de Paris', 'Beurre', 'Crème liquide', 'Œufs',
    'Farine', 'Vin rouge Bordeaux', 'Café en grains']
  return produits.map((p) => {
    const idx = cibles.indexOf(p.nom)
    if (idx === -1) return p
    return { ...p, codeBarres: String(3401234000000 + idx * 7 + 17) }
  })
}

const MISES: Array<[string, number, string, number, string, string, number]> = [
  // [nom, quantité, unité, écart DLC, lieu, auteur, écart date fabrication]
  ['Fond de veau', 4, 'L', 2, 'Chambre froide positive', 'Léa', -1],
  ['Sauce vierge', 2, 'L', 0, 'Chambre froide positive', 'Thomas', 0],
  ['Brunoise de légumes', 3, 'kg', 1, 'Chambre froide positive', 'Léa', 0],
  ['Beurre blanc', 1.5, 'L', 3, 'Chambre froide positive', 'Karim', -1],
  ['Jus de volaille', 2.5, 'L', 5, 'Chambre froide positive', 'Thomas', -2],
  ['Crème pâtissière', 2, 'kg', 1, 'Chambre froide positive', 'Léa', -1],
  ['Bouillon de légumes', 5, 'L', 6, 'Chambre froide positive', 'Karim', -2],
  ['Sauce bordelaise', 2, 'L', -1, 'Chambre froide positive', 'Thomas', -3],
]

export function misesEnPlaceDemo(): MiseEnPlace[] {
  const t = aujourdhuiISO()
  return MISES.map((m, i) => ({
    id: `m${i + 1}`,
    nom: m[0],
    quantite: m[1],
    unite: m[2],
    dateFabrication: ajouterJours(t, m[6]),
    dlc: ajouterJours(t, m[3]),
    lieu: m[4],
    auteur: m[5],
    produitsUtilises: [],
    statut: 'active' as const,
  }))
}

// 10 plats de cuisine française avec recettes complètes (quantités PAR COUVERT)
const RECETTES: Array<[string, Array<[string, number, string, string]>]> = [
  ['Blanquette de veau', [
    ['Épaule de veau', 0.18, 'kg', 'f1'], ['Carottes', 0.1, 'kg', 'f3'], ['Oignons', 0.05, 'kg', 'f3'],
    ['Champignons de Paris', 0.08, 'kg', 'f3'], ['Crème liquide', 0.05, 'L', 'f4'], ['Beurre', 0.02, 'kg', 'f4'],
    ['Riz arborio', 0.09, 'kg', 'f5'],
  ]],
  ['Filet de bar beurre blanc', [
    ['Filet de bar', 0.16, 'kg', 'f2'], ['Beurre', 0.08, 'kg', 'f4'], ['Échalotes', 0.03, 'kg', 'f3'],
    ['Vin blanc de cuisine', 0.05, 'L', 'f5'],
  ]],
  ['Risotto aux champignons', [
    ['Riz arborio', 0.1, 'kg', 'f5'], ['Champignons de Paris', 0.15, 'kg', 'f3'], ['Parmesan', 0.03, 'kg', 'f4'],
    ['Beurre', 0.03, 'kg', 'f4'], ['Oignons', 0.04, 'kg', 'f3'],
  ]],
  ['Tarte Tatin', [
    ['Pommes', 0.25, 'kg', 'f3'], ['Farine', 0.08, 'kg', 'f5'], ['Beurre', 0.06, 'kg', 'f4'], ['Sucre', 0.07, 'kg', 'f5'],
  ]],
  ['Magret de canard sauce au vin de Bordeaux', [
    ['Magret de canard', 1, 'pièce', 'f1'], ['Vin rouge Bordeaux', 0.1, 'pièce', 'f5'],
    ['Échalotes', 0.04, 'kg', 'f3'], ['Beurre', 0.02, 'kg', 'f4'],
  ]],
  ['Soupe à l’oignon gratinée', [
    ['Oignons', 0.25, 'kg', 'f3'], ['Beurre', 0.02, 'kg', 'f4'], ['Comté', 0.04, 'kg', 'f4'],
    ['Farine', 0.01, 'kg', 'f5'], ['Vin blanc de cuisine', 0.02, 'L', 'f5'],
  ]],
  ['Poireaux vinaigrette', [
    ['Poireaux', 0.4, 'botte', 'f3'], ['Huile d’olive', 0.02, 'L', 'f5'], ['Moutarde', 0.01, 'pièce', 'f5'],
    ['Œufs', 0.5, 'pièce', 'f4'],
  ]],
  ['Crème brûlée', [
    ['Crème liquide', 0.15, 'L', 'f4'], ['Œufs', 1, 'pièce', 'f4'], ['Sucre', 0.05, 'kg', 'f5'],
    ['Gousse de vanille', 0.1, 'pièce', 'f4'],
  ]],
  ['Entrecôte bordelaise', [
    ['Entrecôte', 0.35, 'kg', 'f1'], ['Beurre', 0.05, 'kg', 'f4'], ['Échalotes', 0.04, 'kg', 'f3'],
    ['Vin rouge Bordeaux', 0.1, 'pièce', 'f5'],
  ]],
  ['Île flottante', [
    ['Lait entier', 0.2, 'L', 'f4'], ['Œufs', 1, 'pièce', 'f4'], ['Sucre', 0.06, 'kg', 'f5'],
    ['Gousse de vanille', 0.05, 'pièce', 'f4'],
  ]],
]

export function platsDemo(): Plat[] {
  return RECETTES.map((r, i) => ({
    id: `r${i + 1}`,
    nom: r[0],
    ingredients: r[1].map((ing) => ({
      produitNom: ing[0],
      quantiteParCouvert: ing[1],
      unite: ing[2],
      fournisseurId: ing[3],
    })),
  }))
}

export function planningDemo(): DB['planning'] {
  const lundi = lundiDeLaSemaine(ajouterJours(aujourdhuiISO(), 7))
  const services: ServiceRepas[] = []
  for (let i = 0; i < 7; i++) {
    const date = ajouterJours(lundi, i)
    for (const service of ['midi', 'soir'] as const) {
      services.push({ date, service, plats: [], couverts: 30 })
    }
  }
  // Menu pré-rempli à moitié
  const remplir = (date: string, service: 'midi' | 'soir', plats: string[], couverts: number) => {
    const s = services.find((s) => s.date === date && s.service === service)
    if (s) { s.plats = plats; s.couverts = couverts }
  }
  remplir(ajouterJours(lundi, 0), 'midi', ['r7', 'r2', 'r4'], 32)
  remplir(ajouterJours(lundi, 0), 'soir', ['r9', 'r8'], 28)
  remplir(ajouterJours(lundi, 1), 'midi', ['r1', 'r4'], 30)
  remplir(ajouterJours(lundi, 1), 'soir', ['r5', 'r10'], 26)
  remplir(ajouterJours(lundi, 2), 'midi', ['r3', 'r7'], 34)
  remplir(ajouterJours(lundi, 2), 'soir', ['r6', 'r8'], 30)
  remplir(ajouterJours(lundi, 3), 'midi', ['r2', 'r4'], 30)
  remplir(ajouterJours(lundi, 4), 'soir', ['r9', 'r10'], 36)
  return { semaine: lundi, services }
}

export function commandesDemo(t: string): Commande[] {
  return [
    {
      id: 'c1',
      fournisseurId: 'f1',
      lignes: [
        { produit: 'Entrecôte', quantite: 6, unite: 'kg', prixUnitaire: 28.9 },
        { produit: 'Magret de canard', quantite: 10, unite: 'pièce', prixUnitaire: 7.4 },
        { produit: 'Épaule de veau', quantite: 3, unite: 'kg', prixUnitaire: 19.5 },
      ],
      statut: 'recue',
      dateCreation: ajouterJours(t, -12),
      dateEnvoi: ajouterJours(t, -11),
      dateReception: ajouterJours(t, -10),
    },
    {
      id: 'c2',
      fournisseurId: 'f3',
      lignes: [
        { produit: 'Tomates', quantite: 5, unite: 'kg', prixUnitaire: 3.6 },
        { produit: 'Poireaux', quantite: 4, unite: 'botte', prixUnitaire: 2.1 },
      ],
      statut: 'envoyee',
      dateCreation: ajouterJours(t, -3),
      dateEnvoi: ajouterJours(t, -2),
    },
  ]
}

// 2 mois d'historique de pertes, avec une légère baisse pour illustrer l'intérêt de l'outil
export function historiqueDemo(t: string): HistoriquePerte[] {
  const motifs: HistoriquePerte['motif'][] = ['jete', 'jete', 'jete', 'utilise']
  const noms: Array<[string, string, number]> = [
    ['Salade verte', 'Fruits & légumes', 1.3], ['Champignons de Paris', 'Fruits & légumes', 5.4],
    ['Filet de bar', 'Poissons', 26.5], ['Crème liquide', 'Produits laitiers', 4.8],
    ['Tomates', 'Fruits & légumes', 3.6], ['Poulet fermier', 'Viandes', 11.6],
    ['Moules', 'Poissons', 3.9], ['Crevettes', 'Poissons', 17.5],
    ['Beurre', 'Produits laitiers', 9.2], ['Pommes', 'Fruits & légumes', 2.2],
    ['Carottes', 'Fruits & légumes', 1.4], ['Saumon', 'Poissons', 19.8],
    ['Œufs', 'Produits laitiers', 0.32], ['Lait entier', 'Produits laitiers', 1.1],
    ['Épaule de veau', 'Viandes', 19.5], ['Citrons', 'Fruits & légumes', 2.8],
    ['Poireaux', 'Fruits & légumes', 2.1], ['Glace vanille', 'Surgelés', 11.5],
    ['Comté', 'Produits laitiers', 18.5], ['Cabillaud', 'Poissons', 21.9],
  ]
  const hist: HistoriquePerte[] = []
  let id = 1
  // 8 semaines : les quantités jetées diminuent au fil des semaines
  for (let semaine = 0; semaine < 8; semaine++) {
    const nbPertes = Math.max(2, 6 - Math.floor(semaine / 2))
    for (let k = 0; k < nbPertes; k++) {
      const n = noms[(semaine * 3 + k) % noms.length]
      const jour = ajouterJours(t, -(7 - semaine) * 7 + k)
      if (jour > t) continue
      const jete = motifs[k % motifs.length] === 'jete'
      const quantite = jete ? Math.max(1, Math.round((3 - semaine * 0.25) * 10) / 10) : 1
      hist.push({
        id: `h${id++}`,
        date: jour,
        produitNom: n[0],
        categorie: n[1],
        quantite,
        valeur: Math.round(quantite * n[2] * 100) / 100,
        motif: jete ? 'jete' : 'utilise',
        sauveParRappel: !jete && k % 3 === 0,
      })
    }
  }
  return hist
}

export function dbDemo(): DB {
  const t = aujourdhuiISO()
  const produits = attribuerCodesBarres(produitsDemo())
  return {
    version: 1,
    produits,
    misesEnPlace: misesEnPlaceDemo(),
    fournisseurs: FOURNISSEURS,
    plats: platsDemo(),
    planning: planningDemo(),
    commandes: commandesDemo(t),
    historique: historiqueDemo(t),
    notifications: [],
    parametres: {
      nomRestaurant: 'Mon Restaurant',
      delaiAlerte: 2,
      lieux: ['Chambre froide positive', 'Chambre froide négative', 'Réserve sèche', 'Cave'],
      categories: [
        { nom: 'Viandes', dureeJours: 3 },
        { nom: 'Poissons', dureeJours: 2 },
        { nom: 'Fruits & légumes', dureeJours: 5 },
        { nom: 'Produits laitiers', dureeJours: 10 },
        { nom: 'Épicerie', dureeJours: 180 },
        { nom: 'Surgelés', dureeJours: 90 },
        { nom: 'Boissons', dureeJours: 120 },
      ],
      unites: ['kg', 'g', 'L', 'pièce', 'botte'],
      auteurs: ['Léa', 'Thomas', 'Karim'],
    },
  }
}

export const dateDemo = dateVersISO
