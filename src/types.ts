// Modèle de données Stocky (persisté dans localStorage sous « stocky_v1 »)

export type StatutPeremption = 'ok' | 'bientot' | 'perime'

export interface Produit {
  id: string
  nom: string
  categorie: string
  quantite: number
  unite: string
  lieu: string
  fournisseurId: string
  dateReception: string // ISO AAAA-MM-JJ
  datePeremption: string // ISO AAAA-MM-JJ
  prixUnitaire: number
  codeBarres?: string
}

export interface MiseEnPlace {
  id: string
  nom: string
  quantite: number
  unite: string
  dateFabrication: string
  dlc: string
  lieu: string
  auteur: string
  produitsUtilises: string[]
  statut: 'active' | 'utilisee' | 'jetee'
}

export interface Fournisseur {
  id: string
  nom: string
  categorie: string // boucherie, marée, primeur, crèmerie, épicerie
  contact: string
  telephone: string
  email: string
  joursLivraison: number[] // 0 = dimanche … 6 = samedi
  delaiLivraison: number // en jours
}

export interface Ingredient {
  produitNom: string
  quantiteParCouvert: number
  unite: string
  fournisseurId: string
}

export interface Plat {
  id: string
  nom: string
  ingredients: Ingredient[]
}

export interface ServiceRepas {
  date: string // ISO
  service: 'midi' | 'soir'
  plats: string[] // ids de plats
  couverts: number
}

export interface Planning {
  semaine: string // date du lundi (ISO)
  services: ServiceRepas[]
}

export interface LigneCommande {
  produit: string
  quantite: number
  unite: string
  prixUnitaire: number
}

export type StatutCommande = 'preparation' | 'envoyee' | 'recue'

export interface Commande {
  id: string
  fournisseurId: string
  lignes: LigneCommande[]
  statut: StatutCommande
  dateCreation: string
  dateEnvoi?: string
  dateReception?: string
  photoBon?: string // miniature compressée du bon de livraison (dataURL)
}

export interface HistoriquePerte {
  id: string
  date: string
  produitNom: string
  categorie: string
  quantite: number
  valeur: number
  motif: 'jete' | 'utilise'
  sauveParRappel: boolean
}

export interface Notification {
  id: string
  type: 'alerte' | 'info'
  message: string
  date: string
  lue: boolean
  cible: string // écran de destination, ex. « stock »
}

export interface CategorieParam {
  nom: string
  dureeJours: number
}

export interface Parametres {
  nomRestaurant: string
  delaiAlerte: number
  lieux: string[]
  categories: CategorieParam[]
  unites: string[]
  auteurs: string[] // prénoms récents des commis
}

export interface DB {
  version: number
  produits: Produit[]
  misesEnPlace: MiseEnPlace[]
  fournisseurs: Fournisseur[]
  plats: Plat[]
  planning: Planning
  commandes: Commande[]
  historique: HistoriquePerte[]
  notifications: Notification[]
  parametres: Parametres
}
