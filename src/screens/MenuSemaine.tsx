import { useMemo, useState } from 'react'
import { Plus, Trash2, ClipboardList, Check, UtensilsCrossed } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Ingredient, Plat, LigneCommande } from '../types'
import { Modal } from '../components/Modal'
import { Stepper } from '../components/Stepper'
import { JOURS_COURTS, afficherDate, isoVersDate, dateVersISO, ajouterJours } from '../lib/dates'
import { arrondiPratique } from '../lib/rules'
import { euro } from '../lib/format'

interface Proposition {
  produit: string
  besoin: number
  stockDeduit: number
  quantite: number
  unite: string
  fournisseurId: string
  jourLivraison: string
  dateUtilisation: string
  ajoutee: boolean
}

export function MenuSemaine() {
  const { db, majService, ajouterOuFusionnerCommande, toast } = useStocky()
  const [platOuvert, setPlatOuvert] = useState<Plat | 'nouveau' | null>(null)
  const [ajoutService, setAjoutService] = useState<string | null>(null)
  const [propositions, setPropositions] = useState<Proposition[] | null>(null)

  const planning = db.planning
  const finSemaine = ajouterJours(planning.semaine, 6)

  const serviceDe = (date: string, service: 'midi' | 'soir') =>
    planning.services.find((s) => s.date === date && s.service === service)

  const jours = useMemo(() => Array.from({ length: 7 }, (_, i) => ajouterJours(planning.semaine, i)), [planning.semaine])

  // Algorithme de génération de commande (règles 7.5)
  const genererCommande = () => {
    const besoins = new Map<string, { besoin: number; unite: string; dateUtilisation: string; fournisseurId: string }>()
    for (const s of planning.services) {
      if (s.plats.length === 0) continue
      for (const platId of s.plats) {
        const plat = db.plats.find((p) => p.id === platId)
        if (!plat) continue
        for (const ing of plat.ingredients) {
          const cle = `${ing.produitNom}|${ing.unite}`
          const existant = besoins.get(cle)
          if (existant) {
            existant.besoin += ing.quantiteParCouvert * s.couverts
            if (s.date < existant.dateUtilisation) existant.dateUtilisation = s.date
          } else {
            besoins.set(cle, {
              besoin: ing.quantiteParCouvert * s.couverts,
              unite: ing.unite,
              dateUtilisation: s.date,
              fournisseurId: ing.fournisseurId,
            })
          }
        }
      }
    }

    const props: Proposition[] = []
    for (const [cle, b] of besoins) {
      const [produitNom, unite] = cle.split('|')
      // Stock encore valide à la date d'utilisation (péremption ≥ date), consommé FIFO
      const stockValide = db.produits
        .filter((p) => p.nom === produitNom && p.datePeremption >= b.dateUtilisation)
        .sort((a, c) => a.datePeremption.localeCompare(c.datePeremption))
      let reste = b.besoin
      let deduit = 0
      for (const p of stockValide) {
        if (reste <= 0) break
        const pris = Math.min(p.quantite, reste)
        deduit += pris
        reste -= pris
      }
      if (reste <= 0.0001) continue
      const fournisseurId = b.fournisseurId || stockValide[0]?.fournisseurId || db.fournisseurs[0]?.id
      const four = db.fournisseurs.find((f) => f.id === fournisseurId)
      props.push({
        produit: produitNom,
        besoin: Math.round(b.besoin * 100) / 100,
        stockDeduit: Math.round(deduit * 100) / 100,
        quantite: arrondiPratique(reste, unite),
        unite,
        fournisseurId,
        jourLivraison: jourConseille(four, b.dateUtilisation),
        dateUtilisation: b.dateUtilisation,
        ajoutee: false,
      })
    }
    props.sort((a, b) => a.dateUtilisation.localeCompare(b.dateUtilisation))
    setPropositions(props)
    if (props.length === 0) toast('Votre stock couvre déjà ce menu', 'info')
  }

  const validerTout = () => {
    if (!propositions) return
    const parFournisseur = new Map<string, LigneCommande[]>()
    for (const p of propositions.filter((x) => !x.ajoutee)) {
      const pu = db.produits.find((x) => x.nom === p.produit)?.prixUnitaire ?? 0
      const ligne: LigneCommande = { produit: p.produit, quantite: p.quantite, unite: p.unite, prixUnitaire: pu }
      const liste = parFournisseur.get(p.fournisseurId) ?? []
      liste.push(ligne)
      parFournisseur.set(p.fournisseurId, liste)
    }
    for (const [fid, lignes] of parFournisseur) ajouterOuFusionnerCommande(fid, lignes)
    setPropositions(propositions.map((p) => ({ ...p, ajoutee: true })))
    toast(`${parFournisseur.size} commande${parFournisseur.size > 1 ? 's' : ''} mise${parFournisseur.size > 1 ? 's' : ''} à jour dans le panier`)
  }

  const validerUne = (index: number) => {
    if (!propositions) return
    const p = propositions[index]
    const pu = db.produits.find((x) => x.nom === p.produit)?.prixUnitaire ?? 0
    ajouterOuFusionnerCommande(p.fournisseurId, [{ produit: p.produit, quantite: p.quantite, unite: p.unite, prixUnitaire: pu }])
    setPropositions(propositions.map((x, i) => (i === index ? { ...x, ajoutee: true } : x)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rangée-actions">
        <h2 style={{ flex: 1 }}>Semaine du {afficherDate(planning.semaine)} au {afficherDate(finSemaine)}</h2>
        <button className="btn btn-secondaire" onClick={() => setPlatOuvert('nouveau')}>
          <UtensilsCrossed size={20} aria-hidden="true" /> Nouveau plat
        </button>
        <button className="btn btn-primaire btn-lg" onClick={genererCommande}>
          <ClipboardList size={22} aria-hidden="true" /> Générer la commande
        </button>
      </div>

      <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {jours.map((date) => {
          const d = isoVersDate(date)
          return (
            <div key={date} className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3>{JOURS_COURTS[d.getDay()]} {afficherDate(date)}</h3>
              {(['midi', 'soir'] as const).map((service) => {
                const s = serviceDe(date, service)
                const rempli = (s?.plats.length ?? 0) > 0
                return (
                  <div key={service} className={`service-carte${rempli ? ' rempli' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ textTransform: 'capitalize', flex: 1 }}>{service}</strong>
                      {s && rempli && (
                        <span className="badge badge-ok"><Check size={14} aria-hidden="true" /> {s.couverts} couverts</span>
                      )}
                    </div>
                    {s && s.plats.length > 0 && (
                      <ul style={{ margin: '6px 0', paddingLeft: 20 }}>
                        {s.plats.map((pid) => {
                          const plat = db.plats.find((x) => x.id === pid)
                          return (
                            <li key={pid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ flex: 1 }}>{plat?.nom ?? pid}</span>
                              <button
                                className="btn icone btn-danger" style={{ minHeight: 36, minWidth: 36 }}
                                aria-label={`Retirer ${plat?.nom} du service ${service}`}
                                onClick={() => majService(date, service, { plats: s.plats.filter((x) => x !== pid) })}
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {s && rempli && (
                      <div className="rangée-actions">
                        <Stepper label="les couverts" valeur={s.couverts} onChange={(n) => majService(date, service, { couverts: n })} min={0} unite="" />
                      </div>
                    )}
                    <button className="btn btn-doux" onClick={() => setAjoutService(`${date}|${service}`)}>
                      <Plus size={18} aria-hidden="true" /> {rempli ? 'Ajouter un plat' : 'Composer le service'}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Propositions de commande */}
      {propositions && (
        <section className="carte" aria-label="Proposition de commande">
          <div className="rangée-actions" style={{ marginBottom: 10 }}>
            <h2 style={{ flex: 1 }}>Commande proposée</h2>
            {propositions.some((p) => !p.ajoutee) ? (
              <button className="btn btn-primaire btn-lg" onClick={validerTout}>Tout valider</button>
            ) : (
              <span className="badge badge-ok"><Check size={16} aria-hidden="true" /> Tout est dans le panier</span>
            )}
          </div>
          {propositions.length === 0 ? (
            <p style={{ fontSize: 19, fontWeight: 700 }}>Votre stock couvre déjà ce menu.</p>
          ) : (
            propositions.map((p, i) => (
              <div key={`${p.produit}-${p.unite}`} className="ligne-alerte" style={{ marginBottom: 8 }}>
                <div className="infos">
                  <div className="nom">{p.produit}</div>
                  <div className="details">
                    Besoin : {p.besoin} {p.unite} · Stock déduit : {p.stockDeduit} {p.unite}<br />
                    Utilisation le {afficherDate(p.dateUtilisation)} · Livraison conseillée : {p.jourLivraison} · {db.fournisseurs.find((f) => f.id === p.fournisseurId)?.nom}
                  </div>
                </div>
                <Stepper
                  label={`la quantité de ${p.produit}`}
                  valeur={p.quantite}
                  unite={p.unite}
                  min={0}
                  onChange={(n) => setPropositions(propositions.map((x, j) => (j === i ? { ...x, quantite: n } : x)))}
                />
                {p.ajoutee ? (
                  <span className="badge badge-ok"><Check size={16} aria-hidden="true" /> Ajouté</span>
                ) : (
                  <button className="btn btn-ok btn-lg" onClick={() => validerUne(i)}>OK</button>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Choix d'un plat pour un service */}
      {ajoutService && (
        <Modal titre="Ajouter un plat au service" onFermer={() => setAjoutService(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {db.plats.map((plat) => (
              <button
                key={plat.id}
                className="btn btn-lg btn-doux"
                style={{ justifyContent: 'space-between' }}
                onClick={() => {
                  const [date, service] = ajoutService.split('|') as [string, 'midi' | 'soir']
                  const s = serviceDe(date, service)
                  majService(date, service, { plats: [...(s?.plats ?? []), plat.id] })
                  setAjoutService(null)
                }}
              >
                {plat.nom}
                <span className="aide">{plat.ingredients.length} ingrédient{plat.ingredients.length > 1 ? 's' : ''}</span>
              </button>
            ))}
            <button className="btn btn-secondaire" onClick={() => { setPlatOuvert('nouveau'); setAjoutService(null) }}>
              <Plus size={18} aria-hidden="true" /> Créer un nouveau plat
            </button>
          </div>
        </Modal>
      )}

      {platOuvert && (
        <Modal titre={platOuvert === 'nouveau' ? 'Nouveau plat' : `Modifier : ${platOuvert.nom}`} onFermer={() => setPlatOuvert(null)} large>
          <PlatForm
            initial={platOuvert === 'nouveau' ? undefined : platOuvert}
            onFermer={() => setPlatOuvert(null)}
          />
        </Modal>
      )}
    </div>
  )
}

// Jour de livraison conseillé : dernier jour de livraison du fournisseur avant la date d'utilisation
function jourConseille(four: { joursLivraison: number[] } | undefined, dateUtilisation: string): string {
  if (!four || four.joursLivraison.length === 0) return afficherDate(dateUtilisation)
  const cible = isoVersDate(dateUtilisation)
  let meilleur: Date | null = null
  for (const j of four.joursLivraison) {
    const d = new Date(cible)
    const ecart = (j - d.getDay() + 7) % 7
    d.setDate(d.getDate() - ecart)
    if (!meilleur || d > meilleur) meilleur = d
  }
  return JOURS_COURTS[(meilleur ?? cible).getDay()] + ' ' + afficherDate(dateVersISO(meilleur ?? cible))
}

// Fiche recette simplifiée : ingrédients avec quantité PAR COUVERT
function PlatForm({ initial, onFermer }: { initial?: Plat; onFermer: () => void }) {
  const { db, ajouterPlat, modifierPlat } = useStocky()
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients ?? [{ produitNom: '', quantiteParCouvert: 1, unite: 'kg', fournisseurId: db.fournisseurs[0]?.id ?? '' }],
  )
  const [erreur, setErreur] = useState('')

  const majIngredient = (i: number, maj: Partial<Ingredient>) =>
    setIngredients(ingredients.map((ing, j) => (j === i ? { ...ing, ...maj } : ing)))

  const enregistrer = () => {
    const propres = ingredients.filter((i) => i.produitNom.trim())
    if (!nom.trim()) { setErreur('Le nom du plat est obligatoire.'); return }
    if (propres.length === 0) { setErreur('Ajoutez au moins un ingrédient avec un nom.'); return }
    if (initial) modifierPlat(initial.id, { nom: nom.trim(), ingredients: propres })
    else ajouterPlat({ nom: nom.trim(), ingredients: propres })
    onFermer()
  }

  return (
    <div>
      {erreur && <div role="alert" style={{ color: 'var(--rouge)', fontWeight: 700, marginBottom: 10 }}>{erreur}</div>}
      <div className="champ">
        <label htmlFor="plat-nom">Nom du plat</label>
        <input id="plat-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <h3 style={{ margin: '10px 0' }}>Ingrédients (quantité par couvert)</h3>
      {ingredients.map((ing, i) => (
        <div key={i} className="ligne-alerte" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              aria-label={`Nom de l'ingrédient ${i + 1}`}
              list="produits-stock"
              placeholder="Nom du produit"
              value={ing.produitNom}
              onChange={(e) => {
                const produit = db.produits.find((p) => p.nom === e.target.value)
                majIngredient(i, { produitNom: e.target.value, fournisseurId: produit?.fournisseurId ?? ing.fournisseurId, unite: produit?.unite ?? ing.unite })
              }}
            />
            <div className="rangée-actions">
              <Stepper label="la quantité par couvert" valeur={ing.quantiteParCouvert} onChange={(n) => majIngredient(i, { quantiteParCouvert: n })} pas={0.05} min={0} unite={ing.unite} />
              <select aria-label="Unité" className="pastille" value={ing.unite} onChange={(e) => majIngredient(i, { unite: e.target.value })}>
                {db.parametres.unites.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select aria-label="Fournisseur" className="pastille" value={ing.fournisseurId} onChange={(e) => majIngredient(i, { fournisseurId: e.target.value })}>
                {db.fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
          </div>
          <button className="btn icone btn-danger" aria-label={`Retirer l'ingrédient ${i + 1}`} onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}
      <datalist id="produits-stock">
        {[...new Set(db.produits.map((p) => p.nom))].map((n) => <option key={n} value={n} />)}
      </datalist>
      <button className="btn btn-doux" onClick={() => setIngredients([...ingredients, { produitNom: '', quantiteParCouvert: 1, unite: 'kg', fournisseurId: db.fournisseurs[0]?.id ?? '' }])}>
        <Plus size={18} aria-hidden="true" /> Ajouter un ingrédient
      </button>
      <div className="modale-pied" style={{ padding: '16px 0 0' }}>
        <button className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
        <button className="btn btn-primaire btn-lg" onClick={enregistrer}>Enregistrer</button>
      </div>
    </div>
  )
}
