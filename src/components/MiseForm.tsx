import { useState } from 'react'
import { useStocky } from '../store/store'
import type { MiseEnPlace } from '../types'
import { ajouterJours, aujourdhuiISO } from '../lib/dates'
import { Stepper } from './Stepper'

// Création d'une mise en place : durées rapides J+1 à J+5, auteur en pastilles
export function MiseForm({ onFermer }: { onFermer: () => void }) {
  const { db, ajouterMise } = useStocky()
  const { lieux, unites, auteurs } = db.parametres

  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [unite, setUnite] = useState('L')
  const [dateFabrication, setDateFabrication] = useState(aujourdhuiISO())
  const [dlc, setDlc] = useState(ajouterJours(aujourdhuiISO(), 3))
  const [lieu, setLieu] = useState(lieux[0])
  const [auteur, setAuteur] = useState(auteurs[0] ?? '')
  const [autreAuteur, setAutreAuteur] = useState(false)
  const [produitsUtilises, setProduitsUtilises] = useState<string[]>([])
  const [erreur, setErreur] = useState('')

  const basculerProduit = (id: string) => {
    setProduitsUtilises((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  }

  const enregistrer = () => {
    if (!nom.trim()) { setErreur('Le nom de la mise en place est obligatoire.'); return }
    if (quantite <= 0) { setErreur('La quantité doit être supérieure à 0.'); return }
    ajouterMise({
      nom: nom.trim(), quantite, unite, dateFabrication, dlc, lieu,
      auteur: autreAuteur ? auteur.trim() : auteur, produitsUtilises,
    })
    onFermer()
  }

  return (
    <div>
      {erreur && <div role="alert" style={{ color: 'var(--rouge)', fontWeight: 700, marginBottom: 10 }}>{erreur}</div>}

      <div className="champ">
        <label htmlFor="mise-nom">Nom de la mise en place</label>
        <input id="mise-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Fond de veau" />
      </div>

      <div className="champ">
        <label id="mise-qte">Quantité produite</label>
        <div className="rangée-actions">
          <Stepper label="la quantité" valeur={quantite} onChange={setQuantite} pas={0.5} unite={unite} />
          <div className="groupe-pastilles" role="group" aria-label="Unité">
            {unites.map((u) => (
              <button key={u} type="button" className={`pastille${unite === u ? ' activee' : ''}`} aria-pressed={unite === u} onClick={() => setUnite(u)}>{u}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="champ">
        <label htmlFor="mise-fab">Date de fabrication</label>
        <input id="mise-fab" type="date" value={dateFabrication} onChange={(e) => { setDateFabrication(e.target.value); setDlc(ajouterJours(e.target.value, 3)) }} />
      </div>

      <div className="champ">
        <label htmlFor="mise-dlc">DLC</label>
        <input id="mise-dlc" type="date" value={dlc} onChange={(e) => setDlc(e.target.value)} />
        <div className="groupe-pastilles" role="group" aria-label="Durée rapide">
          {[1, 2, 3, 5].map((j) => (
            <button key={j} type="button" className="pastille" onClick={() => setDlc(ajouterJours(dateFabrication, j))}>J+{j}</button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label id="mise-lieu">Lieu de stockage</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="mise-lieu">
          {lieux.map((l) => (
            <button key={l} type="button" className={`pastille${lieu === l ? ' activee' : ''}`} aria-pressed={lieu === l} onClick={() => setLieu(l)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label id="mise-auteur">Réalisée par</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="mise-auteur">
          {auteurs.map((a) => (
            <button
              key={a} type="button"
              className={`pastille${!autreAuteur && auteur === a ? ' activee' : ''}`}
              aria-pressed={!autreAuteur && auteur === a}
              onClick={() => { setAutreAuteur(false); setAuteur(a) }}
            >
              {a}
            </button>
          ))}
          <button
            type="button"
            className={`pastille${autreAuteur ? ' activee' : ''}`}
            aria-pressed={autreAuteur}
            onClick={() => setAutreAuteur(true)}
          >
            + Autre
          </button>
        </div>
        {autreAuteur && (
          <input aria-label="Prénom de l'auteur" value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Prénom" />
        )}
      </div>

      <div className="champ">
        <label id="mise-prod">Produits utilisés (optionnel)</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="mise-prod" style={{ maxHeight: 180, overflowY: 'auto' }}>
          {db.produits.slice(0, 30).map((p) => (
            <button
              key={p.id} type="button"
              className={`pastille${produitsUtilises.includes(p.id) ? ' activee' : ''}`}
              aria-pressed={produitsUtilises.includes(p.id)}
              onClick={() => basculerProduit(p.id)}
            >
              {p.nom}
            </button>
          ))}
        </div>
      </div>

      <div className="modale-pied" style={{ padding: 0, borderTop: 'none' }}>
        <button type="button" className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
        <button type="button" className="btn btn-primaire btn-lg" onClick={enregistrer}>Enregistrer</button>
      </div>
    </div>
  )
}

export type { MiseEnPlace }
