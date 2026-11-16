import { useMemo, useState } from 'react'
import { Plus, ChefHat, Package, ShoppingCart, Euro, CircleCheckBig } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Ecran } from '../components/Layout'
import { Modal } from '../components/Modal'
import { ProductForm } from '../components/ProductForm'
import { MiseForm } from '../components/MiseForm'
import { JeterDialog } from '../components/JeterDialog'
import { StatusBadge } from '../components/StatusBadge'
import { elementsAlerte } from '../lib/rules'
import { afficherDate, libelleCompteARebours, ecartJours, pluriel } from '../lib/dates'
import { euro } from '../lib/format'

type FiltreAlerte = 'aucun' | 'aujourdhui' | '48h' | 'perimes'

export function Dashboard({ setEcran }: { setEcran: (e: Ecran) => void }) {
  const { db, utiliserProduit, jeterProduit, utiliserMise, jeterMise } = useStocky()
  const [filtre, setFiltre] = useState<FiltreAlerte>('aucun')
  const [formProduit, setFormProduit] = useState(false)
  const [formMise, setFormMise] = useState(false)
  const [jeterCible, setJeterCible] = useState<{ id: string; type: 'produit' | 'miseEnPlace'; nom: string; quantite: number; unite: string } | null>(null)

  const delai = db.parametres.delaiAlerte
  const alertes = useMemo(() => elementsAlerte(db.produits, db.misesEnPlace, delai), [db.produits, db.misesEnPlace, delai])

  const compteurs = useMemo(() => ({
    aujourdhui: alertes.filter((a) => ecartJours(a.datePeremption) === 0).length,
    h48: alertes.filter((a) => { const d = ecartJours(a.datePeremption); return d >= 1 && d <= 2 }).length,
    perimes: alertes.filter((a) => ecartJours(a.datePeremption) < 0).length,
  }), [alertes])

  const listeFiltree = useMemo(() => {
    return alertes.filter((a) => {
      const d = ecartJours(a.datePeremption)
      if (filtre === 'aujourdhui') return d === 0
      if (filtre === '48h') return d >= 1 && d <= 2
      if (filtre === 'perimes') return d < 0
      return true
    })
  }, [alertes, filtre])

  const pertesDuMois = useMemo(() => {
    const mois = new Date().toISOString().slice(0, 7)
    return db.historique.filter((h) => h.date.startsWith(mois) && h.motif === 'jete').reduce((s, h) => s + h.valeur, 0)
  }, [db.historique])

  const lignesEnPrep = db.commandes.filter((c) => c.statut === 'preparation').reduce((n, c) => n + c.lignes.length, 0)

  const utiliser = (id: string, type: 'produit' | 'miseEnPlace') => {
    if (type === 'produit') utiliserProduit(id)
    else utiliserMise(id)
  }

  const jeter = (cible: NonNullable<typeof jeterCible>, quantite: number) => {
    if (cible.type === 'produit') jeterProduit(cible.id, quantite)
    else jeterMise(cible.id, quantite)
  }

  const compteur = (cle: FiltreAlerte, chiffre: number, libelle: string, classe: string) => (
    <button
      className={`compteur-alerte ${classe}${filtre === cle ? ' selectionnee' : ''}`}
      onClick={() => setFiltre(filtre === cle ? 'aucun' : cle)}
      aria-pressed={filtre === cle}
    >
      <span className="chiffre">{chiffre}</span>
      <span className="libelle">{libelle}</span>
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section aria-label="Alertes de péremption">
        <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {compteur('aujourdhui', compteurs.aujourdhui, "Périme aujourd'hui", 'orange')}
          {compteur('48h', compteurs.h48, 'Périme dans les 48 h', 'orange-clair')}
          {compteur('perimes', compteurs.perimes, 'Déjà périmés', 'rouge')}
        </div>
      </section>

      <section aria-label="Résumé">
        <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <div className="carte carte-resume">
            <Package className="icone" size={26} aria-hidden="true" />
            <span className="chiffre">{db.produits.length}</span>
            <span className="libelle">{pluriel(db.produits.length, 'produit en stock', 'produits en stock')}</span>
          </div>
          <div className="carte carte-resume">
            <ChefHat className="icone" size={26} aria-hidden="true" />
            <span className="chiffre">{db.misesEnPlace.filter((m) => m.statut === 'active').length}</span>
            <span className="libelle">mises en place en cours</span>
          </div>
          <div className="carte carte-resume">
            <ShoppingCart className="icone" size={26} aria-hidden="true" />
            <span className="chiffre">{lignesEnPrep}</span>
            <span className="libelle">{pluriel(lignesEnPrep, 'ligne en préparation', 'lignes en préparation')}</span>
          </div>
          <div className="carte carte-resume">
            <Euro className="icone" size={26} aria-hidden="true" />
            <span className="chiffre">{euro(pertesDuMois)}</span>
            <span className="libelle">de pertes ce mois-ci</span>
          </div>
        </div>
      </section>

      <section aria-label="Accès rapide">
        <div className="rangée-actions">
          <button className="btn btn-primaire btn-lg" onClick={() => setFormProduit(true)}>
            <Plus size={22} aria-hidden="true" /> Ajouter un produit
          </button>
          <button className="btn btn-secondaire btn-lg" onClick={() => setFormMise(true)}>
            <Plus size={22} aria-hidden="true" /> Nouvelle mise en place
          </button>
          <button className="btn btn-secondaire btn-lg" onClick={() => setEcran('commande')}>
            <ShoppingCart size={22} aria-hidden="true" /> Voir la commande
          </button>
        </div>
      </section>

      <section aria-label="À utiliser en priorité">
        <h2 style={{ marginBottom: 12 }}>À utiliser en priorité</h2>
        {listeFiltree.length === 0 ? (
          <div className="carte etat-vide">
            <CircleCheckBig size={44} aria-hidden="true" />
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Rien à signaler, tout est sous contrôle</p>
            <p style={{ margin: 0 }}>Aucun produit ni mise en place proche de la péremption.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listeFiltree.map((a) => (
              <div key={a.id} className="ligne-alerte">
                <StatusBadge statut={a.statut} datePeremption={a.datePeremption} compteARebours />
                <div className="infos">
                  <div className="nom">
                    {a.nom}
                    {a.type === 'miseEnPlace' && <span className="badge badge-neutre" style={{ marginLeft: 8 }}>Mise en place</span>}
                  </div>
                  <div className="details">
                    {a.quantite} {a.unite} · {a.lieu} · DLC {afficherDate(a.datePeremption)} · {libelleCompteARebours(a.datePeremption)}
                  </div>
                </div>
                <div className="rangée-actions">
                  <button className="btn btn-ok" onClick={() => utiliser(a.id, a.type)}>
                    Utilisé{a.type === 'miseEnPlace' ? 'e' : ''}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setJeterCible({ id: a.id, type: a.type, nom: a.nom, quantite: a.quantite, unite: a.unite })}
                  >
                    Jeté{a.type === 'miseEnPlace' ? 'e' : ''}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {formProduit && (
        <Modal titre="Ajouter un produit" onFermer={() => setFormProduit(false)}>
          <ProductForm onFermer={() => setFormProduit(false)} />
        </Modal>
      )}
      {formMise && (
        <Modal titre="Nouvelle mise en place" onFermer={() => setFormMise(false)}>
          <MiseForm onFermer={() => setFormMise(false)} />
        </Modal>
      )}
      {jeterCible && (
        <JeterDialog
          nom={jeterCible.nom}
          quantiteMax={jeterCible.quantite}
          unite={jeterCible.unite}
          confirmer={(q) => jeter(jeterCible, q)}
          onFermer={() => setJeterCible(null)}
        />
      )}
    </div>
  )
}
