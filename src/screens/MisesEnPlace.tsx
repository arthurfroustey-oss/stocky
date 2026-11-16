import { useState } from 'react'
import { Plus, Printer } from 'lucide-react'
import { useStocky } from '../store/store'
import { Modal } from '../components/Modal'
import { MiseForm } from '../components/MiseForm'
import { JeterDialog } from '../components/JeterDialog'
import { StatusBadge } from '../components/StatusBadge'
import { EtiquettePrint } from '../components/EtiquettePrint'
import { statutPeremption, misesEnPlaceActives, triFIFO } from '../lib/rules'
import { afficherDate, libelleCompteARebours } from '../lib/dates'

export function MisesEnPlace() {
  const { db, utiliserMise, jeterMise } = useStocky()
  const [formOuvert, setFormOuvert] = useState(false)
  const [jeterCible, setJeterCible] = useState<{ id: string; nom: string; quantite: number; unite: string } | null>(null)
  const [impression, setImpression] = useState<{ nom: string; dateFabrication: string; dlc: string; auteur: string; lieu: string } | null>(null)

  const delai = db.parametres.delaiAlerte
  const mises = triFIFO(misesEnPlaceActives(db.misesEnPlace))
  const terminees = db.misesEnPlace.filter((m) => m.statut !== 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rangée-actions">
        <button className="btn btn-primaire btn-lg" onClick={() => setFormOuvert(true)}>
          <Plus size={22} aria-hidden="true" /> Nouvelle mise en place
        </button>
        <span className="aide">{mises.length} en cours · {terminees.length} terminée{terminees.length > 1 ? 's' : ''}</span>
      </div>

      {mises.length === 0 ? (
        <div className="carte etat-vide">
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Aucune mise en place en cours</p>
          <p style={{ margin: 0 }}>Créez-en une avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {mises.map((m) => {
            const statut = statutPeremption(m.dlc, delai)
            return (
              <div key={m.id} className={`etiquette-mise ${statut}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 20 }}>{m.nom}</strong>
                  <StatusBadge statut={statut} datePeremption={m.dlc} compteARebours />
                </div>
                <div style={{ color: 'var(--texte-2)', fontSize: 16 }}>
                  {m.quantite} {m.unite} · {m.lieu}<br />
                  Fabriquée le {afficherDate(m.dateFabrication)} par {m.auteur}<br />
                  DLC {afficherDate(m.dlc)} · {libelleCompteARebours(m.dlc)}
                </div>
                <div className="rangée-actions">
                  <button className="btn btn-ok" onClick={() => utiliserMise(m.id)}>Utilisée</button>
                  <button className="btn btn-danger" onClick={() => setJeterCible({ id: m.id, nom: m.nom, quantite: m.quantite, unite: m.unite })}>Jetée</button>
                  <button className="btn btn-doux" onClick={() => setImpression({ nom: m.nom, dateFabrication: m.dateFabrication, dlc: m.dlc, auteur: m.auteur, lieu: m.lieu })}>
                    <Printer size={18} aria-hidden="true" /> Étiquette
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {terminees.length > 0 && (
        <section aria-label="Mises en place terminées">
          <h2 style={{ margin: '10px 0' }}>Terminées</h2>
          <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {terminees.map((m) => (
              <div key={m.id} className="carte" style={{ opacity: 0.7, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div>
                  <strong>{m.nom}</strong>
                  <div className="aide">{m.quantite} {m.unite} · {afficherDate(m.dlc)}</div>
                </div>
                <span className={`badge ${m.statut === 'utilisee' ? 'badge-ok' : 'badge-perime'}`}>
                  {m.statut === 'utilisee' ? 'Utilisée' : 'Jetée'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {formOuvert && (
        <Modal titre="Nouvelle mise en place" onFermer={() => setFormOuvert(false)}>
          <MiseForm onFermer={() => setFormOuvert(false)} />
        </Modal>
      )}
      {jeterCible && (
        <JeterDialog
          nom={jeterCible.nom}
          quantiteMax={jeterCible.quantite}
          unite={jeterCible.unite}
          confirmer={(q) => jeterMise(jeterCible.id, q)}
          onFermer={() => setJeterCible(null)}
        />
      )}
      {impression && <EtiquettePrint etiquette={impression} onFermer={() => setImpression(null)} />}
    </div>
  )
}
