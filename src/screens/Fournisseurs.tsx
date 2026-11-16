import { useState } from 'react'
import { Plus, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Fournisseur } from '../types'
import { Modal, ConfirmDialog } from '../components/Modal'
import { JOURS_LETTRES } from '../lib/dates'

const CATEGORIES = ['boucherie', 'marée', 'primeur', 'crèmerie', 'épicerie']

export function Fournisseurs() {
  const { db, ajouterFournisseur, modifierFournisseur, supprimerFournisseur, toast } = useStocky()
  const [edition, setEdition] = useState<Fournisseur | null>(null)
  const [creation, setCreation] = useState(false)
  const [suppression, setSuppression] = useState<Fournisseur | null>(null)

  const produitsDe = (id: string) => db.produits.filter((p) => p.fournisseurId === id)

  const confirmerSuppression = (f: Fournisseur) => {
    const rattaches = produitsDe(f.id).length
    if (rattaches > 0) {
      toast(`Impossible : ${rattaches} produit${rattaches > 1 ? 's sont' : ' est'} rattaché${rattaches > 1 ? 's' : ''} à ce fournisseur. Réaffectez-les d'abord.`, 'alerte')
    } else {
      supprimerFournisseur(f.id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rangée-actions">
        <button className="btn btn-primaire btn-lg" onClick={() => setCreation(true)}>
          <Plus size={22} aria-hidden="true" /> Nouveau fournisseur
        </button>
      </div>

      <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {db.fournisseurs.map((f) => (
          <div key={f.id} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 20 }}>{f.nom}</strong>
                <div className="aide" style={{ textTransform: 'capitalize' }}>{f.categorie}</div>
              </div>
              <div className="rangée-actions">
                <button className="btn icone btn-doux" aria-label={`Modifier ${f.nom}`} onClick={() => setEdition(f)}><Pencil size={18} aria-hidden="true" /></button>
                <button className="btn icone btn-danger" aria-label={`Supprimer ${f.nom}`} onClick={() => setSuppression(f)}><Trash2 size={18} aria-hidden="true" /></button>
              </div>
            </div>
            <div style={{ color: 'var(--texte-2)' }}>{f.contact}</div>
            <div className="rangée-actions">
              <a className="btn btn-petit btn-doux" href={`tel:${f.telephone}`}><Phone size={16} aria-hidden="true" /> {f.telephone}</a>
              <a className="btn btn-petit btn-doux" href={`mailto:${f.email}`}><Mail size={16} aria-hidden="true" /> Écrire</a>
            </div>
            <div className="groupe-pastilles" role="group" aria-label={`Jours de livraison de ${f.nom}`}>
              {[1, 2, 3, 4, 5, 6, 0].map((j) => (
                <span key={j} className={`pastille${f.joursLivraison.includes(j) ? ' activee' : ''}`} style={{ minWidth: 44, justifyContent: 'center' }}>
                  {JOURS_LETTRES[j]}
                </span>
              ))}
            </div>
            <div className="aide">Délai de livraison : {f.delaiLivraison} jour{f.delaiLivraison > 1 ? 's' : ''}</div>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>
                Produits ({produitsDe(f.id).length})
              </summary>
              <p style={{ color: 'var(--texte-2)', margin: '6px 0 0' }}>
                {produitsDe(f.id).map((p) => p.nom).join(', ') || 'Aucun produit rattaché.'}
              </p>
            </details>
          </div>
        ))}
      </div>

      {(creation || edition) && (
        <FournisseurForm
          initial={edition ?? undefined}
          onFermer={() => { setCreation(false); setEdition(null) }}
          enregistrer={(donnees, id) => {
            if (id) modifierFournisseur(id, donnees)
            else ajouterFournisseur(donnees)
            setCreation(false); setEdition(null)
          }}
        />
      )}

      {suppression && (
        <ConfirmDialog
          titre="Supprimer le fournisseur"
          message={`Supprimer « ${suppression.nom} » ? Cette action est définitive.`}
          confirmer={() => confirmerSuppression(suppression)}
          onFermer={() => setSuppression(null)}
        />
      )}
    </div>
  )
}

function FournisseurForm({ initial, onFermer, enregistrer }: {
  initial?: Fournisseur
  onFermer: () => void
  enregistrer: (donnees: Omit<Fournisseur, 'id'>, id?: string) => void
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [categorie, setCategorie] = useState(initial?.categorie ?? 'boucherie')
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [telephone, setTelephone] = useState(initial?.telephone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [jours, setJours] = useState<number[]>(initial?.joursLivraison ?? [2])
  const [delai, setDelai] = useState(initial?.delaiLivraison ?? 1)
  const [erreur, setErreur] = useState('')

  const basculerJour = (j: number) => setJours((l) => (l.includes(j) ? l.filter((x) => x !== j) : [...l, j]))

  const valider = () => {
    if (!nom.trim()) { setErreur('Le nom du fournisseur est obligatoire.'); return }
    if (!/^\+?[\d\s.()-]{6,}$/.test(telephone)) { setErreur('Le numéro de téléphone semble invalide.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErreur("L'adresse e-mail semble invalide."); return }
    if (jours.length === 0) { setErreur('Choisissez au moins un jour de livraison.'); return }
    enregistrer({ nom: nom.trim(), categorie, contact, telephone, email, joursLivraison: jours, delaiLivraison: delai }, initial?.id)
  }

  return (
    <Modal
      titre={initial ? `Modifier : ${initial.nom}` : 'Nouveau fournisseur'}
      onFermer={onFermer}
      pied={
        <>
          <button className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
          <button className="btn btn-primaire btn-lg" onClick={valider}>Enregistrer</button>
        </>
      }
    >
      {erreur && <div role="alert" style={{ color: 'var(--rouge)', fontWeight: 700, marginBottom: 10 }}>{erreur}</div>}
      <div className="champ">
        <label htmlFor="f-nom">Nom</label>
        <input id="f-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <div className="champ">
        <label id="f-cat">Catégorie</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="f-cat">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={`pastille${categorie === c ? ' activee' : ''}`} aria-pressed={categorie === c} onClick={() => setCategorie(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="champ">
        <label htmlFor="f-contact">Contact</label>
        <input id="f-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <div className="champ">
        <label htmlFor="f-tel">Téléphone</label>
        <input id="f-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
      </div>
      <div className="champ">
        <label htmlFor="f-email">E-mail</label>
        <input id="f-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="champ">
        <label id="f-jours">Jours de livraison</label>
        <div className="groupe-pastilles" role="group" aria-labelledby="f-jours">
          {[1, 2, 3, 4, 5, 6, 0].map((j) => (
            <button key={j} type="button" className={`pastille${jours.includes(j) ? ' activee' : ''}`} aria-pressed={jours.includes(j)} onClick={() => basculerJour(j)}>
              {JOURS_LETTRES[j]}
            </button>
          ))}
        </div>
      </div>
      <div className="champ">
        <label htmlFor="f-delai">Délai de livraison (jours)</label>
        <input id="f-delai" type="number" min="0" max="7" value={delai} onChange={(e) => setDelai(Number(e.target.value))} />
      </div>
    </Modal>
  )
}
