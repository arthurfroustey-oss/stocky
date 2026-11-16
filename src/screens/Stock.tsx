import { useMemo, useState } from 'react'
import { Plus, Search, Pencil } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Produit, StatutPeremption } from '../types'
import { Modal } from '../components/Modal'
import { ProductForm } from '../components/ProductForm'
import { JeterDialog } from '../components/JeterDialog'
import { StatusBadge } from '../components/StatusBadge'
import { statutPeremption, triFIFO } from '../lib/rules'
import { afficherDate } from '../lib/dates'
import { euro, nombre } from '../lib/format'

type Tri = 'peremption' | 'nom' | 'valeur'
type FiltreStatut = 'tous' | StatutPeremption

export function Stock() {
  const { db, utiliserProduit, jeterProduit } = useStocky()
  const [recherche, setRecherche] = useState('')
  const [fCategorie, setFCategorie] = useState('toutes')
  const [fLieu, setFLieu] = useState('tous')
  const [fStatut, setFStatut] = useState<FiltreStatut>('tous')
  const [tri, setTri] = useState<Tri>('peremption')
  const [formOuvert, setFormOuvert] = useState(false)
  const [edition, setEdition] = useState<Produit | null>(null)
  const [jeterCible, setJeterCible] = useState<Produit | null>(null)

  const delai = db.parametres.delaiAlerte

  const produits = useMemo(() => {
    let liste = db.produits.filter((p) => {
      const q = recherche.trim().toLowerCase()
      if (q && !p.nom.toLowerCase().includes(q) && !(p.codeBarres ?? '').includes(q)) return false
      if (fCategorie !== 'toutes' && p.categorie !== fCategorie) return false
      if (fLieu !== 'tous' && p.lieu !== fLieu) return false
      if (fStatut !== 'tous' && statutPeremption(p.datePeremption, delai) !== fStatut) return false
      return true
    })
    if (tri === 'peremption') liste = triFIFO(liste)
    else if (tri === 'nom') liste = [...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    else liste = [...liste].sort((a, b) => b.quantite * b.prixUnitaire - a.quantite * a.prixUnitaire)
    return liste
  }, [db.produits, recherche, fCategorie, fLieu, fStatut, tri, delai])

  const pastille = (actif: boolean, libelle: string, action: () => void) => (
    <button className={`pastille${actif ? ' activee' : ''}`} aria-pressed={actif} onClick={action}>{libelle}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="filtre-ligne">
        <div className="recherche">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un produit ou un code-barres…"
            aria-label="Rechercher un produit"
          />
        </div>
        <button className="btn btn-primaire btn-lg" onClick={() => setFormOuvert(true)}>
          <Plus size={22} aria-hidden="true" /> Ajouter
        </button>
      </div>

      <div className="filtre-ligne" role="group" aria-label="Filtre par catégorie">
        {pastille(fCategorie === 'toutes', 'Toutes catégories', () => setFCategorie('toutes'))}
        {db.parametres.categories.map((c) => pastille(fCategorie === c.nom, c.nom, () => setFCategorie(c.nom)))}
      </div>

      <div className="filtre-ligne" role="group" aria-label="Filtre par lieu et statut">
        {pastille(fLieu === 'tous', 'Tous lieux', () => setFLieu('tous'))}
        {db.parametres.lieux.map((l) => pastille(fLieu === l, l, () => setFLieu(l)))}
        <span style={{ width: 12 }} />
        {pastille(fStatut === 'tous', 'Tous statuts', () => setFStatut('tous'))}
        {pastille(fStatut === 'ok', 'OK', () => setFStatut('ok'))}
        {pastille(fStatut === 'bientot', 'Bientôt périmé', () => setFStatut('bientot'))}
        {pastille(fStatut === 'perime', 'Périmé', () => setFStatut('perime'))}
        <span style={{ flex: 1 }} />
        <label className="aide" htmlFor="tri-stock" style={{ fontWeight: 700 }}>Trier par</label>
        <select id="tri-stock" className="pastille" style={{ paddingRight: 30 }} value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
          <option value="peremption">Date de péremption</option>
          <option value="nom">Nom</option>
          <option value="valeur">Valeur</option>
        </select>
      </div>

      <p className="aide" role="status">{produits.length} produit{produits.length > 1 ? 's' : ''} affiché{produits.length > 1 ? 's' : ''}</p>

      {/* Vue tableau (grand écran) */}
      <div className="carte vue-tableau" style={{ overflowX: 'auto' }}>
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Produit</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Quantité</th>
              <th scope="col">Lieu</th>
              <th scope="col">Fournisseur</th>
              <th scope="col">Réception</th>
              <th scope="col">Péremption</th>
              <th scope="col">Prix unit.</th>
              <th scope="col">Statut</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => {
              const statut = statutPeremption(p.datePeremption, delai)
              return (
                <tr key={p.id} className={statut === 'perime' ? 'perime' : statut === 'bientot' ? 'bientot' : ''}>
                  <td style={{ fontWeight: 700 }}>{p.nom}</td>
                  <td>{p.categorie}</td>
                  <td>{nombre(p.quantite)} {p.unite}</td>
                  <td>{p.lieu}</td>
                  <td>{db.fournisseurs.find((f) => f.id === p.fournisseurId)?.nom ?? '—'}</td>
                  <td>{afficherDate(p.dateReception)}</td>
                  <td>{afficherDate(p.datePeremption)}</td>
                  <td>{euro(p.prixUnitaire)}</td>
                  <td><StatusBadge statut={statut} /></td>
                  <td>
                    <div className="rangée-actions">
                      <button className="btn btn-petit btn-doux" aria-label={`Modifier ${p.nom}`} onClick={() => setEdition(p)}>
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                      <button className="btn btn-petit btn-ok" onClick={() => utiliserProduit(p.id)}>Utilisé</button>
                      <button className="btn btn-petit btn-danger" onClick={() => setJeterCible(p)}>Jeté</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {produits.length === 0 && (
          <div className="etat-vide"><p>Aucun produit ne correspond à ces filtres.</p></div>
        )}
      </div>

      {/* Vue cartes (tablette/mobile) */}
      <div className="vue-cartes" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {produits.map((p) => {
          const statut = statutPeremption(p.datePeremption, delai)
          return (
            <div key={p.id} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 20 }}>{p.nom}</strong>
                <StatusBadge statut={statut} />
              </div>
              <div className="details" style={{ color: 'var(--texte-2)', fontSize: 16 }}>
                {p.categorie} · {nombre(p.quantite)} {p.unite} · {p.lieu}<br />
                {db.fournisseurs.find((f) => f.id === p.fournisseurId)?.nom ?? '—'} · DLC {afficherDate(p.datePeremption)} · {euro(p.prixUnitaire)} / {p.unite}
              </div>
              <div className="rangée-actions">
                <button className="btn btn-doux" aria-label={`Modifier ${p.nom}`} onClick={() => setEdition(p)}>
                  <Pencil size={18} aria-hidden="true" /> Modifier
                </button>
                <button className="btn btn-ok" onClick={() => utiliserProduit(p.id)}>Utilisé</button>
                <button className="btn btn-danger" onClick={() => setJeterCible(p)}>Jeté</button>
              </div>
            </div>
          )
        })}
        {produits.length === 0 && (
          <div className="carte etat-vide"><p>Aucun produit ne correspond à ces filtres.</p></div>
        )}
      </div>

      {formOuvert && (
        <Modal titre="Ajouter un produit" onFermer={() => setFormOuvert(false)}>
          <ProductForm onFermer={() => setFormOuvert(false)} />
        </Modal>
      )}
      {edition && (
        <Modal titre={`Modifier : ${edition.nom}`} onFermer={() => setEdition(null)}>
          <ProductForm initial={edition} editId={edition.id} onFermer={() => setEdition(null)} />
        </Modal>
      )}
      {jeterCible && (
        <JeterDialog
          nom={jeterCible.nom}
          quantiteMax={jeterCible.quantite}
          unite={jeterCible.unite}
          confirmer={(q) => jeterProduit(jeterCible.id, q)}
          onFermer={() => setJeterCible(null)}
        />
      )}
    </div>
  )
}
