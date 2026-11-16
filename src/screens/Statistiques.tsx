import { useMemo, useState } from 'react'
import { Trash2, Euro, Percent, HeartHandshake, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useStocky } from '../store/store'
import { ajouterJours, aujourdhuiISO, lundiDeLaSemaine, afficherDate } from '../lib/dates'
import { euro } from '../lib/format'
import { tauxGaspillage } from '../lib/rules'

type Periode = 'semaine' | 'mois' | 'trimestre'
const LIBELLES: Record<Periode, string> = { semaine: 'Semaine', mois: 'Mois', trimestre: 'Trimestre' }

export function Statistiques() {
  const { db } = useStocky()
  const [periode, setPeriode] = useState<Periode>('mois')

  const stats = useMemo(() => {
    const fin = aujourdhuiISO()
    const jours = periode === 'semaine' ? 7 : periode === 'mois' ? 30 : 90
    const debut = ajouterJours(fin, -jours + 1)
    const debutPrecedent = ajouterJours(debut, -jours)
    const dansPeriode = (date: string, d1: string, d2: string) => date >= d1 && date <= d2

    const pertes = db.historique.filter((h) => h.motif === 'jete' && dansPeriode(h.date, debut, fin))
    const pertesPrecedentes = db.historique.filter((h) => h.motif === 'jete' && dansPeriode(h.date, debutPrecedent, ajouterJours(debut, -1)))

    const quantiteJetee = pertes.reduce((s, h) => s + h.quantite, 0)
    const valeurPertes = pertes.reduce((s, h) => s + h.valeur, 0)
    const valeurPertesPrecedentes = pertesPrecedentes.reduce((s, h) => s + h.valeur, 0)
    const sauves = db.historique.filter((h) => h.sauveParRappel && dansPeriode(h.date, debut, fin)).length
    const sauvesPrecedents = db.historique.filter((h) => h.sauveParRappel && dansPeriode(h.date, debutPrecedent, ajouterJours(debut, -1))).length

    // Entrées = valeur des commandes reçues sur la période (repli : produits reçus)
    const entrees = db.commandes
      .filter((c) => c.statut === 'recue' && c.dateReception && dansPeriode(c.dateReception, debut, fin))
      .reduce((s, c) => s + c.lignes.reduce((t, l) => t + l.quantite * l.prixUnitaire, 0), 0)
    const entreesRepli = db.produits
      .filter((p) => dansPeriode(p.dateReception, debut, fin))
      .reduce((s, p) => s + p.quantite * p.prixUnitaire, 0)
    const base = entrees > 0 ? entrees : entreesRepli

    // Pertes par semaine (8 dernières semaines)
    const parSemaine: Array<{ semaine: string; valeur: number }> = []
    for (let i = 7; i >= 0; i--) {
      const lundi = lundiDeLaSemaine(ajouterJours(fin, -i * 7))
      const valeur = db.historique
        .filter((h) => h.motif === 'jete' && h.date >= lundi && h.date <= ajouterJours(lundi, 6))
        .reduce((s, h) => s + h.valeur, 0)
      parSemaine.push({ semaine: lundi, valeur })
    }

    // Pertes par catégorie
    const parCategorie = new Map<string, number>()
    for (const h of pertes) parCategorie.set(h.categorie, (parCategorie.get(h.categorie) ?? 0) + h.valeur)
    const categories = [...parCategorie.entries()].sort((a, b) => b[1] - a[1])

    // Top 5 des produits les plus jetés
    const parProduit = new Map<string, { quantite: number; valeur: number }>()
    for (const h of pertes) {
      const actuel = parProduit.get(h.produitNom) ?? { quantite: 0, valeur: 0 }
      parProduit.set(h.produitNom, { quantite: actuel.quantite + h.quantite, valeur: actuel.valeur + h.valeur })
    }
    const top5 = [...parProduit.entries()].sort((a, b) => b[1].valeur - a[1].valeur).slice(0, 5)

    return {
      quantiteJetee, valeurPertes, valeurPertesPrecedentes, sauves, sauvesPrecedents,
      taux: tauxGaspillage(valeurPertes, base), debut, fin, parSemaine, categories, top5,
    }
  }, [db, periode])

  const variation = (actuel: number, precedent: number): { fleche: 'hausse' | 'baisse' | 'stable'; texte: string } => {
    if (precedent === 0) return actuel === 0 ? { fleche: 'stable', texte: 'stable' } : { fleche: 'hausse', texte: `+${actuel}` }
    const pct = Math.round(((actuel - precedent) / precedent) * 100)
    if (pct === 0) return { fleche: 'stable', texte: 'stable' }
    return pct > 0 ? { fleche: 'hausse', texte: `+${pct} %` } : { fleche: 'baisse', texte: `${pct} %` }
  }

  const vPertes = variation(stats.valeurPertes, stats.valeurPertesPrecedentes)
  const vSauves = variation(stats.sauves, stats.sauvesPrecedents)

  const maxSemaine = Math.max(...stats.parSemaine.map((s) => s.valeur), 1)
  const maxCategorie = Math.max(...stats.categories.map((c) => c[1]), 1)

  // Courbe SVG des pertes par semaine
  const largeur = 640, hauteur = 220, marge = 40
  const points = stats.parSemaine.map((s, i) => {
    const x = marge + (i / (stats.parSemaine.length - 1)) * (largeur - marge * 2)
    const y = hauteur - marge - (s.valeur / maxSemaine) * (hauteur - marge * 2)
    return { ...s, x, y }
  })

  const indicateur = (Icone: typeof Trash2, valeur: string, libelle: string, varInfo?: { fleche: string; texte: string }) => (
    <div className="carte carte-resume">
      <Icone className="icone" size={26} aria-hidden="true" />
      <span className="chiffre">{valeur}</span>
      <span className="libelle">{libelle}</span>
      {varInfo && (
        <span className={`badge ${varInfo.fleche === 'baisse' ? 'badge-ok' : varInfo.fleche === 'hausse' ? 'badge-bientot' : 'badge-neutre'}`}>
          {varInfo.fleche === 'baisse' ? <ArrowDownRight size={14} aria-hidden="true" /> : varInfo.fleche === 'hausse' ? <ArrowUpRight size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
          {varInfo.texte} vs période précédente
        </span>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="filtre-ligne" role="group" aria-label="Période">
        {(Object.keys(LIBELLES) as Periode[]).map((p) => (
          <button key={p} className={`pastille${periode === p ? ' activee' : ''}`} aria-pressed={periode === p} onClick={() => setPeriode(p)}>
            {LIBELLES[p]}
          </button>
        ))}
        <span className="aide">Du {afficherDate(stats.debut)} au {afficherDate(stats.fin)}</span>
      </div>

      <div className="grille-cartes" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {indicateur(Trash2, String(Math.round(stats.quantiteJetee * 10) / 10), 'quantité jetée')}
        {indicateur(Euro, euro(stats.valeurPertes), 'valeur des pertes', vPertes)}
        {indicateur(Percent, `${Math.round(stats.taux * 10) / 10} %`, 'taux de gaspillage')}
        {indicateur(HeartHandshake, String(stats.sauves), 'produits sauvés grâce aux rappels', vSauves)}
      </div>

      <div className="carte">
        <h2 style={{ marginBottom: 8 }}>Pertes en € par semaine</h2>
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={`Courbe des pertes hebdomadaires sur 8 semaines, maximum ${euro(maxSemaine)}`} style={{ width: '100%', height: 'auto' }}>
          <line x1={marge} y1={hauteur - marge} x2={largeur - marge} y2={hauteur - marge} stroke="#DDE7DD" strokeWidth="2" />
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#1F7A4D" strokeWidth="3" strokeLinejoin="round"
          />
          {points.map((p) => (
            <g key={p.semaine}>
              <circle cx={p.x} cy={p.y} r="5" fill="#1F7A4D" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="13" fill="#14301F" fontWeight="700">
                {Math.round(p.valeur)}
              </text>
              <text x={p.x} y={hauteur - marge + 20} textAnchor="middle" fontSize="12" fill="#4A5D52">
                {afficherDate(p.semaine).slice(0, 5)}
              </text>
            </g>
          ))}
        </svg>
        <p className="aide">Résumé : les pertes hebdomadaires vont de {euro(Math.min(...stats.parSemaine.map((s) => s.valeur)))} à {euro(maxSemaine)}.</p>
      </div>

      <div className="carte">
        <h2 style={{ marginBottom: 12 }}>Pertes par catégorie</h2>
        {stats.categories.length === 0 ? (
          <p className="aide">Aucune perte sur la période.</p>
        ) : (
          stats.categories.map(([cat, valeur]) => (
            <div key={cat} className="barre-h">
              <span>{cat}</span>
              <span className="piste"><span className="remplie" style={{ width: `${(valeur / maxCategorie) * 100}%` }} /></span>
              <span className="valeur">{euro(valeur)}</span>
            </div>
          ))
        )}
      </div>

      <div className="carte">
        <h2 style={{ marginBottom: 12 }}>Top 5 des produits les plus jetés</h2>
        {stats.top5.length === 0 ? (
          <p className="aide">Aucun produit jeté sur la période. À garder ainsi !</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.top5.map(([nom, v], i) => (
              <li key={nom} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="badge badge-neutre">{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{nom}</span>
                <span>{Math.round(v.quantite * 10) / 10} jetés · {euro(v.valeur)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
