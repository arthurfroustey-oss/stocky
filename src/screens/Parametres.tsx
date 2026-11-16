import { useEffect, useState } from 'react'
import { Bell, BellOff, RotateCcw, Plus, Trash2 } from 'lucide-react'
import { useStocky } from '../store/store'
import { Modal, ConfirmDialog } from '../components/Modal'
import { Stepper } from '../components/Stepper'

type Autorisation = 'defaut' | 'accordee' | 'refusee' | 'indisponible'

export function Parametres() {
  const { db, majParametres, reinitialiser, toast } = useStocky()
  const [confirmReset, setConfirmReset] = useState(false)
  const [autorisation, setAutorisation] = useState<Autorisation>('defaut')
  const [listeOuverte, setListeOuverte] = useState<'lieux' | 'categories' | 'unites' | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) { setAutorisation('indisponible'); return }
    setAutorisation(Notification.permission === 'granted' ? 'accordee' : Notification.permission === 'denied' ? 'refusee' : 'defaut')
  }, [])

  const demanderNotifications = async () => {
    if (!('Notification' in window)) { toast('Notifications navigateur indisponibles sur cet appareil.', 'alerte'); return }
    const res = await Notification.requestPermission()
    setAutorisation(res === 'granted' ? 'accordee' : res === 'denied' ? 'refusee' : 'defaut')
    if (res === 'granted') {
      toast('Notifications navigateur activées')
      new Notification('Stocky', { body: 'Vous serez alerté avant les péremptions.' })
    } else {
      toast('Notifications restées désactivées : les rappels resteront dans l’application.', 'info')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <section className="carte" aria-label="Général">
        <h2 style={{ marginBottom: 12 }}>Général</h2>
        <div className="champ">
          <label htmlFor="nom-resto">Nom du restaurant</label>
          <input id="nom-resto" value={db.parametres.nomRestaurant} onChange={(e) => majParametres({ nomRestaurant: e.target.value })} />
        </div>
        <div className="champ">
          <label id="lbl-delai">Délai d'alerte avant péremption</label>
          <Stepper
            label="le délai d'alerte"
            valeur={db.parametres.delaiAlerte}
            unite="jours"
            min={1}
            max={14}
            onChange={(n) => majParametres({ delaiAlerte: n })}
          />
          <span className="aide">Un produit est signalé « Bientôt périmé » quand il périme dans ce délai ou moins.</span>
        </div>
      </section>

      <section className="carte" aria-label="Notifications navigateur">
        <h2 style={{ marginBottom: 12 }}>Notifications navigateur</h2>
        <div className="rangée-actions">
          {autorisation === 'accordee' ? (
            <span className="badge badge-ok"><Bell size={16} aria-hidden="true" /> Notifications accordées</span>
          ) : autorisation === 'refusee' ? (
            <span className="badge badge-perime"><BellOff size={16} aria-hidden="true" /> Notifications refusées (réglages du navigateur)</span>
          ) : autorisation === 'indisponible' ? (
            <span className="badge badge-neutre"><BellOff size={16} aria-hidden="true" /> Notifications indisponibles</span>
          ) : (
            <span className="badge badge-neutre"><BellOff size={16} aria-hidden="true" /> Notifications non demandées</span>
          )}
          {autorisation !== 'accordee' && autorisation !== 'indisponible' && (
            <button className="btn btn-primaire" onClick={demanderNotifications}>
              <Bell size={20} aria-hidden="true" /> Activer les notifications navigateur
            </button>
          )}
        </div>
        <p className="aide" style={{ marginTop: 8 }}>Sans autorisation, les rappels restent visibles dans l'application (cloche en haut).</p>
      </section>

      <section className="carte" aria-label="Gestion des listes">
        <h2 style={{ marginBottom: 12 }}>Gestion des listes</h2>
        <div className="rangée-actions">
          <button className="btn btn-secondaire" onClick={() => setListeOuverte('lieux')}>Lieux de stockage ({db.parametres.lieux.length})</button>
          <button className="btn btn-secondaire" onClick={() => setListeOuverte('categories')}>Catégories ({db.parametres.categories.length})</button>
          <button className="btn btn-secondaire" onClick={() => setListeOuverte('unites')}>Unités ({db.parametres.unites.length})</button>
        </div>
      </section>

      <section className="carte" aria-label="Réinitialisation">
        <h2 style={{ marginBottom: 12 }}>Données</h2>
        <button className="btn btn-danger btn-lg" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={20} aria-hidden="true" /> Réinitialiser les données de démo
        </button>
        <p className="aide" style={{ marginTop: 8 }}>Toutes vos modifications locales seront remplacées par les données de démonstration.</p>
      </section>

      {confirmReset && (
        <ConfirmDialog
          titre="Réinitialiser les données"
          message="Attention : cette action supprime toutes vos données actuelles (stock, mises en place, commandes, historique) et restaure les données de démo. Voulez-vous continuer ?"
          libelleConfirmer="Réinitialiser"
          confirmer={reinitialiser}
          onFermer={() => setConfirmReset(false)}
        />
      )}

      {listeOuverte && (
        <ListeEditor
          type={listeOuverte}
          onFermer={() => setListeOuverte(null)}
        />
      )}
    </div>
  )
}

// Éditeur des listes paramétrables : lieux, catégories (avec durée), unités
function ListeEditor({ type, onFermer }: { type: 'lieux' | 'categories' | 'unites'; onFermer: () => void }) {
  const { db, majParametres, toast } = useStocky()
  const p = db.parametres
  const titres = { lieux: 'Lieux de stockage', categories: 'Catégories', unites: 'Unités' }
  const [nouveau, setNouveau] = useState('')

  const utilise = (valeur: string) =>
    db.produits.some((x) => (type === 'lieux' ? x.lieu === valeur : type === 'unites' ? x.unite === valeur : x.categorie === valeur)) ||
    db.misesEnPlace.some((x) => type === 'lieux' && x.lieu === valeur)

  const ajouter = () => {
    const v = nouveau.trim()
    if (!v) return
    if (type === 'lieux') majParametres({ lieux: [...p.lieux, v] })
    else if (type === 'unites') majParametres({ unites: [...p.unites, v] })
    else majParametres({ categories: [...p.categories, { nom: v, dureeJours: 5 }] })
    setNouveau('')
    toast(`« ${v} » ajouté`)
  }

  const renommer = (ancien: string, valeur: string) => {
    const v = valeur.trim()
    if (!v || v === ancien) return
    if (type === 'lieux') majParametres({ lieux: p.lieux.map((l) => (l === ancien ? v : l)) })
    else if (type === 'unites') majParametres({ unites: p.unites.map((u) => (u === ancien ? v : u)) })
    else majParametres({ categories: p.categories.map((c) => (c.nom === ancien ? { ...c, nom: v } : c)) })
  }

  const supprimer = (valeur: string) => {
    if (utilise(valeur)) {
      toast(`Impossible : « ${valeur} » est utilisé par des produits existants.`, 'alerte')
      return
    }
    if (type === 'lieux') majParametres({ lieux: p.lieux.filter((l) => l !== valeur) })
    else if (type === 'unites') majParametres({ unites: p.unites.filter((u) => u !== valeur) })
    else majParametres({ categories: p.categories.filter((c) => c.nom !== valeur) })
    toast(`« ${valeur} » supprimé`)
  }

  const majDuree = (nom: string, dureeJours: number) => {
    majParametres({ categories: p.categories.map((c) => (c.nom === nom ? { ...c, dureeJours } : c)) })
  }

  return (
    <Modal titre={titres[type]} onFermer={onFermer}>
      {(type === 'lieux' ? p.lieux : type === 'unites' ? p.unites : p.categories.map((c) => c.nom)).map((valeur) => (
        <div key={valeur} className="ligne-alerte" style={{ marginBottom: 8 }}>
          <input
            aria-label={`Renommer ${valeur}`}
            defaultValue={valeur}
            onBlur={(e) => renommer(valeur, e.target.value)}
            style={{ flex: 1, minHeight: 48, border: '2px solid var(--bordure)', borderRadius: 10, padding: '8px 12px', fontFamily: 'inherit', fontSize: 18 }}
          />
          {type === 'categories' && (
            <label className="rangée-actions aide" style={{ gap: 6 }}>
              Conservation :
              <input
                type="number" min="1" max="365"
                aria-label={`Durée de conservation par défaut pour ${valeur}`}
                defaultValue={p.categories.find((c) => c.nom === valeur)?.dureeJours ?? 5}
                onBlur={(e) => majDuree(valeur, Number(e.target.value))}
                style={{ width: 90, minHeight: 48, border: '2px solid var(--bordure)', borderRadius: 10, padding: '8px 12px', fontFamily: 'inherit', fontSize: 18 }}
              />
              jours
            </label>
          )}
          <button className="btn icone btn-danger" aria-label={`Supprimer ${valeur}`} onClick={() => supprimer(valeur)}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="rangée-actions" style={{ marginTop: 10 }}>
        <input
          aria-label="Nouvelle entrée"
          placeholder="Nouvelle entrée…"
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ajouter() }}
          style={{ flex: 1, minHeight: 48, border: '2px solid var(--bordure)', borderRadius: 10, padding: '8px 12px', fontFamily: 'inherit', fontSize: 18 }}
        />
        <button className="btn btn-primaire" onClick={ajouter}><Plus size={20} aria-hidden="true" /> Ajouter</button>
      </div>
    </Modal>
  )
}
