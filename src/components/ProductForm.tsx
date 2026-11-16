import { useMemo, useState } from 'react'
import { useStocky } from '../store/store'
import type { Produit } from '../types'
import { ajouterJours, aujourdhuiISO, afficherDate } from '../lib/dates'
import { dlcDefaut } from '../lib/rules'
import { Stepper } from './Stepper'

// Formulaire d'ajout / modification rapide d'un produit (une seule fenêtre, valeurs par défaut)
export function ProductForm({ initial, onFermer, editId }: {
  initial?: Partial<Produit>
  onFermer: () => void
  editId?: string
}) {
  const { db, ajouterProduit, modifierProduit } = useStocky()
  const { fournisseurs } = db
  const { categories, unites, lieux } = db.parametres

  const [nom, setNom] = useState(initial?.nom ?? '')
  const [categorie, setCategorie] = useState(initial?.categorie ?? 'Viandes')
  const [quantite, setQuantite] = useState(initial?.quantite ?? 1)
  const [unite, setUnite] = useState(initial?.unite ?? 'kg')
  const [lieu, setLieu] = useState(initial?.lieu ?? lieux[0])
  const [fournisseurId, setFournisseurId] = useState(initial?.fournisseurId ?? fournisseurDefaut(categorie, fournisseurs))
  const [prix, setPrix] = useState(initial?.prixUnitaire ?? 0)
  const [dateReception, setDateReception] = useState(initial?.dateReception ?? aujourdhuiISO())
  const [datePeremption, setDatePeremption] = useState(initial?.datePeremption ?? dlcDefaut(categorie, categories))
  const [codeBarres, setCodeBarres] = useState(initial?.codeBarres ?? '')
  const [erreurs, setErreurs] = useState<string[]>([])

  const nomsConnus = useMemo(
    () => [...new Set(db.produits.map((p) => p.nom))].sort((a, b) => a.localeCompare(b, 'fr')),
    [db.produits],
  )

  const changerCategorie = (c: string) => {
    setCategorie(c)
    setFournisseurId(fournisseurDefaut(c, fournisseurs))
    if (!editId) setDatePeremption(dlcDefaut(c, categories))
  }

  const valider = (): boolean => {
    const errs: string[] = []
    if (!nom.trim()) errs.push('Le nom du produit est obligatoire.')
    if (quantite <= 0) errs.push('La quantité doit être supérieure à 0.')
    if (prix < 0) errs.push('Le prix unitaire ne peut pas être négatif.')
    if (!datePeremption) errs.push('La date de péremption est obligatoire.')
    setErreurs(errs)
    return errs.length === 0
  }

  const enregistrer = (continuer: boolean) => {
    if (!valider()) return
    const donnees = {
      nom: nom.trim(), categorie, quantite, unite, lieu, fournisseurId,
      dateReception, datePeremption, prixUnitaire: prix, codeBarres: codeBarres || undefined,
    }
    if (editId) modifierProduit(editId, donnees)
    else ajouterProduit(donnees)
    if (continuer && !editId) {
      setNom(''); setQuantite(1); setCodeBarres('')
      setDatePeremption(dlcDefaut(categorie, categories))
      setErreurs([])
    } else {
      onFermer()
    }
  }

  const fournisseurDefautPour = (c: string) => fournisseurDefaut(c, fournisseurs)

  return (
    <form onSubmit={(e) => { e.preventDefault(); enregistrer(false) }}>
      {erreurs.length > 0 && (
        <div role="alert" style={{ color: 'var(--rouge)', fontWeight: 700, marginBottom: 12 }}>
          {erreurs.map((e) => <p key={e} style={{ margin: '4px 0' }}>{e}</p>)}
        </div>
      )}

      <div className="champ">
        <label htmlFor="prod-nom">Nom du produit</label>
        <input id="prod-nom" list="noms-connus" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Entrecôte" />
        <datalist id="noms-connus">
          {nomsConnus.map((n) => <option key={n} value={n} />)}
        </datalist>
        {codeBarres && <span className="aide">Code-barres : {codeBarres}</span>}
      </div>

      <div className="champ">
        <label id="lbl-cat">Catégorie</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="lbl-cat">
          {categories.map((c) => (
            <button
              key={c.nom} type="button"
              className={`pastille${categorie === c.nom ? ' activee' : ''}`}
              aria-pressed={categorie === c.nom}
              onClick={() => changerCategorie(c.nom)}
            >
              {c.nom}
            </button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label id="lbl-qte">Quantité</label>
        <div className="rangée-actions">
          <Stepper label="la quantité" valeur={quantite} onChange={setQuantite} pas={quantite < 10 ? 1 : 1} unite={unite} />
          <div className="groupe-pastilles" role="group" aria-label="Unité">
            {unites.map((u) => (
              <button key={u} type="button" className={`pastille${unite === u ? ' activee' : ''}`} aria-pressed={unite === u} onClick={() => setUnite(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="champ">
        <label id="lbl-lieu">Lieu de stockage</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="lbl-lieu">
          {lieux.map((l) => (
            <button key={l} type="button" className={`pastille${lieu === l ? ' activee' : ''}`} aria-pressed={lieu === l} onClick={() => setLieu(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="champ">
        <label id="lbl-four">Fournisseur</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="lbl-four">
          {fournisseurs.map((f) => (
            <button key={f.id} type="button" className={`pastille${fournisseurId === f.id ? ' activee' : ''}`} aria-pressed={fournisseurId === f.id} onClick={() => setFournisseurId(f.id)}>
              {f.nom}
            </button>
          ))}
        </div>
        <span className="aide">Défaut pour « {categorie} » : {fournisseurs.find((f) => f.id === fournisseurDefautPour(categorie))?.nom ?? '—'}</span>
      </div>

      <div className="champ">
        <label htmlFor="prod-prix">Prix unitaire (€)</label>
        <input id="prod-prix" type="number" min="0" step="0.01" inputMode="decimal" value={prix} onChange={(e) => setPrix(Number(e.target.value))} />
      </div>

      <div className="champ">
        <label htmlFor="prod-recep">Date de réception</label>
        <input id="prod-recep" type="date" value={dateReception} onChange={(e) => setDateReception(e.target.value)} />
      </div>

      <div className="champ">
        <label htmlFor="prod-dlc">Date de péremption (DLC/DDM)</label>
        <input id="prod-dlc" type="date" value={datePeremption} onChange={(e) => setDatePeremption(e.target.value)} />
        <div className="groupe-pastilles" role="group" aria-label="Durée rapide de péremption">
          {[1, 2, 3, 5, 7].map((j) => (
            <button key={j} type="button" className="pastille" onClick={() => setDatePeremption(ajouterJours(dateReception, j))}>
              J+{j}
            </button>
          ))}
        </div>
        <span className="aide">Proposé le {afficherDate(datePeremption)} selon la catégorie « {categorie} »</span>
      </div>

      <div className="modale-pied" style={{ padding: 0, borderTop: 'none' }}>
        <button type="button" className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
        {!editId && (
          <button type="button" className="btn btn-secondaire" onClick={() => enregistrer(true)}>
            Enregistrer et ajouter un autre
          </button>
        )}
        <button type="submit" className="btn btn-primaire btn-lg">Enregistrer</button>
      </div>
    </form>
  )
}

function fournisseurDefaut(categorie: string, fournisseurs: ProduitFournisseurs): string {
  const map: Record<string, string> = {
    Viandes: 'boucherie', Poissons: 'marée', 'Fruits & légumes': 'primeur',
    'Produits laitiers': 'crèmerie', Épicerie: 'épicerie', Surgelés: 'épicerie', Boissons: 'épicerie',
  }
  return fournisseurs.find((f) => f.categorie === map[categorie])?.id ?? fournisseurs[0]?.id ?? ''
}

type ProduitFournisseurs = { id: string; categorie: string; nom: string }[]
