import { useState } from 'react'
import { Modal } from './Modal'
import { Stepper } from './Stepper'

// Règle 4 : « Jeté » demande la quantité jetée (pas-à-pas +/− avec bouton « Tout »)
export function JeterDialog({ nom, quantiteMax, unite, confirmer, onFermer }: {
  nom: string
  quantiteMax: number
  unite: string
  confirmer: (quantite: number) => void
  onFermer: () => void
}) {
  const [quantite, setQuantite] = useState(Math.min(1, quantiteMax))
  return (
    <Modal
      titre={`Jeter : ${nom}`}
      onFermer={onFermer}
      pied={
        <>
          <button className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
          <button
            className="btn btn-danger btn-lg"
            onClick={() => { confirmer(quantite); onFermer() }}
          >
            Confirmer la perte
          </button>
        </>
      }
    >
      <p>Quelle quantité est jetée ?</p>
      <div className="rangée-actions">
        <Stepper label="la quantité jetée" valeur={quantite} onChange={setQuantite} min={0} max={quantiteMax} unite={unite} pas={quantiteMax <= 5 ? 0.5 : 1} />
        <button className="btn btn-doux" onClick={() => setQuantite(quantiteMax)}>Tout ({quantiteMax} {unite})</button>
      </div>
    </Modal>
  )
}
