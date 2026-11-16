// Utilitaires dates : tout en interne en ISO (AAAA-MM-JJ), affichage JJ/MM/AAAA

export function aujourdhuiISO(): string {
  return dateVersISO(new Date())
}

export function dateVersISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${j}`
}

export function isoVersDate(iso: string): Date {
  const [y, m, j] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, j || 1)
}

export function ajouterJours(iso: string, n: number): string {
  const d = isoVersDate(iso)
  d.setDate(d.getDate() + n)
  return dateVersISO(d)
}

// Écart en jours calendaires entre aujourd'hui et une date cible (positif = futur)
export function ecartJours(cibleISO: string): number {
  const a = isoVersDate(aujourdhuiISO()).getTime()
  const c = isoVersDate(cibleISO).getTime()
  return Math.round((c - a) / 86400000)
}

export function diffJours(aISO: string, bISO: string): number {
  return Math.round((isoVersDate(bISO).getTime() - isoVersDate(aISO).getTime()) / 86400000)
}

export function afficherDate(iso?: string): string {
  if (!iso) return '—'
  const [y, m, j] = iso.split('-')
  return `${j}/${m}/${y}`
}

export function lundiDeLaSemaine(iso: string): string {
  const d = isoVersDate(iso)
  const decal = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - decal)
  return dateVersISO(d)
}

export const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
export const JOURS_LETTRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

// « Périme aujourd'hui », « Périme demain », « Périme dans X jours », « Périmé depuis X jour(s) »
export function libelleCompteARebours(iso: string): string {
  const d = ecartJours(iso)
  if (d < 0) return d === -1 ? 'Périmé depuis 1 jour' : `Périmé depuis ${-d} jours`
  if (d === 0) return "Périme aujourd'hui"
  if (d === 1) return 'Périme demain'
  return `Périme dans ${d} jours`
}

export function pluriel(n: number, singulier: string, plurielMot?: string): string {
  return n <= 1 ? singulier : plurielMot ?? singulier + 's'
}
