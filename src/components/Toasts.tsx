import { CheckCircle2, Info, AlertTriangle, Undo2, X } from 'lucide-react'
import { useStocky } from '../store/store'

// Toast de confirmation après chaque action (disparition après 3 s, bouton Annuler si possible)
export function Toasts() {
  const { toasts, fermerToast } = useStocky()
  if (toasts.length === 0) return null
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'succes' ? <CheckCircle2 size={20} aria-hidden="true" /> : t.type === 'info' ? <Info size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
          <span>{t.message}</span>
          {t.annuler && (
            <button className="annuler" onClick={() => { t.annuler?.(); fermerToast(t.id) }}>
              <Undo2 size={16} aria-hidden="true" /> Annuler
            </button>
          )}
          <button className="annuler" aria-label="Fermer la notification" onClick={() => fermerToast(t.id)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
