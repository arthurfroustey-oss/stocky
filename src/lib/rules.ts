import type { Produit, MiseEnPlace, StatutPeremption } from '../types'
import { ecartJours, ajouterJours, aujourdhuiISO } from './dates'

// Règle 1 : statut de péremption selon l'écart en jours avec le délai d'alerte
export function statutPeremption(datePeremption: string, delaiAlerte: number): StatutPeremption {
  const d = ecartJours(datePeremption)
  if (d < 0) return 'perime'
  if (d <= delaiAlerte) return 'bientot'
  return 'ok'
}

// Règle 5 : dates par défaut selon la catégorie
export function dlcDefaut(categorie: string, categories: { nom: string; dureeJours: number }[]): string {
  const c = categories.find((c) => c.nom === categorie)
  return ajouterJours(aujourdhuiISO(), c?.dureeJours ?? 5)
}

// Règle 3 : un produit « utilisé » avant péremption et après déclenchement du rappel = sauveParRappel
export function estSauveParRappel(datePeremption: string, delaiAlerte: number): boolean {
  const d = ecartJours(datePeremption)
  return d >= 0 && d <= delaiAlerte
}

// Règle 2 : FIFO — tri par date de péremption croissante (périmés en premier)
export function triFIFO<T extends { datePeremption?: string; dlc?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.datePeremption ?? a.dlc ?? '9999-12-31'
    const db = b.datePeremption ?? b.dlc ?? '9999-12-31'
    return da.localeCompare(db)
  })
}

export interface ElementAlerte {
  id: string
  type: 'produit' | 'miseEnPlace'
  nom: string
  quantite: number
  unite: string
  lieu: string
  datePeremption: string
  statut: StatutPeremption
  prixUnitaire: number
  categorie: string
}

// Liste combinée produits + mises en place, triée FIFO, pour le tableau de bord et les alertes
export function elementsAlerte(produits: Produit[], mises: MiseEnPlace[], delaiAlerte: number): ElementAlerte[] {
  const items: ElementAlerte[] = [
    ...produits.map((p) => ({
      id: p.id,
      type: 'produit' as const,
      nom: p.nom,
      quantite: p.quantite,
      unite: p.unite,
      lieu: p.lieu,
      datePeremption: p.datePeremption,
      statut: statutPeremption(p.datePeremption, delaiAlerte),
      prixUnitaire: p.prixUnitaire,
      categorie: p.categorie,
    })),
    ...misesEnPlaceActives(mises).map((m) => ({
      id: m.id,
      type: 'miseEnPlace' as const,
      nom: m.nom,
      quantite: m.quantite,
      unite: m.unite,
      lieu: m.lieu,
      datePeremption: m.dlc,
      statut: statutPeremption(m.dlc, delaiAlerte),
      prixUnitaire: 0,
      categorie: 'Mise en place',
    })),
  ]
  return triFIFO(items)
}

export function misesEnPlaceActives(mises: MiseEnPlace[]): MiseEnPlace[] {
  return mises.filter((m) => m.statut === 'active')
}

// Règle 6 : taux de gaspillage = pertes ÷ entrées sur la période
export function tauxGaspillage(pertes: number, entrees: number): number {
  if (entrees <= 0) return 0
  return (pertes / entrees) * 100
}

// Arrondi à une quantité pratique : au 0,5 supérieur pour kg/g/L, à l'unité supérieure sinon
export function arrondiPratique(q: number, unite: string): number {
  if (['kg', 'L', 'g'].includes(unite)) return Math.ceil(q * 2) / 2
  return Math.ceil(q)
}
