import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { StatutPeremption } from '../types'
import { libelleCompteARebours } from '../lib/dates'

// Règle d'accessibilité : la couleur n'est jamais seule — icône + texte toujours
const CONFIG: Record<StatutPeremption, { classe: string; libelle: string; Icone: typeof CheckCircle2 }> = {
  ok: { classe: 'badge-ok', libelle: 'OK', Icone: CheckCircle2 },
  bientot: { classe: 'badge-bientot', libelle: 'Bientôt périmé', Icone: AlertTriangle },
  perime: { classe: 'badge-perime', libelle: 'Périmé', Icone: XCircle },
}

export function StatusBadge({ statut, datePeremption, compteARebours = false }: {
  statut: StatutPeremption
  datePeremption?: string
  compteARebours?: boolean
}) {
  const c = CONFIG[statut]
  return (
    <span className={`badge ${c.classe}`} role="status">
      <c.Icone size={16} aria-hidden="true" />
      {compteARebours && datePeremption ? libelleCompteARebours(datePeremption) : c.libelle}
    </span>
  )
}
