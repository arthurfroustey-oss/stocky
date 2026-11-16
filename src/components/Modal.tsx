import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

// Modale accessible : rôle dialog, fermeture par Échap, focus initial
export function Modal({ titre, onFermer, children, pied, large = false }: {
  titre: string
  onFermer: () => void
  children: ReactNode
  pied?: ReactNode
  large?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const gererTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', gererTouche)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', gererTouche)
  }, [onFermer])

  return (
    <div className="voile" onClick={(e) => { if (e.target === e.currentTarget) onFermer() }}>
      <div
        className={`modale${large ? ' modale-large' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modale-entete">
          <h2>{titre}</h2>
          <button className="btn icone btn-doux" onClick={onFermer} aria-label="Fermer">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="modale-corps">{children}</div>
        {pied && <div className="modale-pied">{pied}</div>}
      </div>
    </div>
  )
}

// Fenêtre de confirmation simple, réservée aux actions destructrices
export function ConfirmDialog({ titre, message, confirmer, onFermer, libelleConfirmer = 'Supprimer' }: {
  titre: string
  message: string
  confirmer: () => void
  onFermer: () => void
  libelleConfirmer?: string
}) {
  return (
    <Modal
      titre={titre}
      onFermer={onFermer}
      pied={
        <>
          <button className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
          <button
            className="btn btn-danger"
            onClick={() => { confirmer(); onFermer() }}
          >
            {libelleConfirmer}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}
