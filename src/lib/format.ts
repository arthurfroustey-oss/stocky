// Formats français : montants « 12,50 € », nombres, dates déjà gérées dans dates.ts

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmtNombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export function euro(montant: number): string {
  return fmtEur.format(montant || 0)
}

export function nombre(n: number): string {
  return fmtNombre.format(n || 0)
}

export function euroCompact(montant: number): string {
  if (Math.abs(montant) >= 1000) {
    return fmtNombre.format(Math.round((montant / 1000) * 10) / 10) + ' k€'
  }
  return fmtEur.format(montant)
}
