import { Minus, Plus } from 'lucide-react'

// Pas-à-pas +/− pour les quantités (peu de saisie clavier)
export function Stepper({ valeur, onChange, pas = 1, min = 0, max = 99999, label, unite }: {
  valeur: number
  onChange: (n: number) => void
  pas?: number
  min?: number
  max?: number
  label: string
  unite?: string
}) {
  const borner = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100))
  return (
    <div className="pasapas" role="group" aria-label={label}>
      <button type="button" aria-label={`Diminuer ${label}`} onClick={() => onChange(borner(valeur - pas))}>
        <Minus size={22} aria-hidden="true" />
      </button>
      <span className="valeur" aria-live="polite">
        {valeur}
        {unite ? ` ${unite}` : ''}
      </span>
      <button type="button" aria-label={`Augmenter ${label}`} onClick={() => onChange(borner(valeur + pas))}>
        <Plus size={22} aria-hidden="true" />
      </button>
    </div>
  )
}
