import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  LayoutDashboard, Package, ChefHat, CalendarDays, ShoppingCart, Truck,
  BarChart3, Settings, Bell, ScanLine, MoreHorizontal, X, CheckCheck,
} from 'lucide-react'
import { useStocky } from '../store/store'
import { Logo } from './Logo'
import { ecartJours } from '../lib/dates'

export type Ecran = 'dashboard' | 'stock' | 'preparations' | 'menu' | 'commande' | 'fournisseurs' | 'stats' | 'parametres'

export const TITRES: Record<Ecran, string> = {
  dashboard: 'Tableau de bord',
  stock: 'Stock',
  preparations: 'Mises en place',
  menu: 'Menu de la semaine',
  commande: 'Commande',
  fournisseurs: 'Fournisseurs',
  stats: 'Statistiques gaspillage',
  parametres: 'Paramètres',
}

const NAV_PRINCIPALE: Array<{ ecran: Ecran; libelle: string; Icone: typeof Package }> = [
  { ecran: 'dashboard', libelle: 'Tableau de bord', Icone: LayoutDashboard },
  { ecran: 'stock', libelle: 'Stock', Icone: Package },
  { ecran: 'preparations', libelle: 'Mises en place', Icone: ChefHat },
  { ecran: 'menu', libelle: 'Menu de la semaine', Icone: CalendarDays },
  { ecran: 'commande', libelle: 'Commande', Icone: ShoppingCart },
]

const NAV_SECONDAIRE: Array<{ ecran: Ecran; libelle: string; Icone: typeof Package }> = [
  { ecran: 'fournisseurs', libelle: 'Fournisseurs', Icone: Truck },
  { ecran: 'stats', libelle: 'Statistiques', Icone: BarChart3 },
  { ecran: 'parametres', libelle: 'Paramètres', Icone: Settings },
]

export function Layout({ ecran, setEcran, onScanner, children }: {
  ecran: Ecran
  setEcran: (e: Ecran) => void
  onScanner: () => void
  children: ReactNode
}) {
  const { db, marquerLue, marquerToutLu } = useStocky()
  const [notifsOuvertes, setNotifsOuvertes] = useState(false)
  const [plusOuvert, setPlusOuvert] = useState(false)

  const nonLues = db.notifications.filter((n) => !n.lue).length
  const alertesStock = db.produits.filter((p) => ecartJours(p.datePeremption) <= db.parametres.delaiAlerte).length
  const lignesEnPrep = db.commandes.filter((c) => c.statut === 'preparation').reduce((n, c) => n + c.lignes.length, 0)

  const compterBadge = (e: Ecran) =>
    e === 'stock' ? alertesStock : e === 'commande' ? lignesEnPrep : 0

  const aller = (e: Ecran) => { setEcran(e); setPlusOuvert(false); setNotifsOuvertes(false) }

  const navItem = (item: { ecran: Ecran; libelle: string; Icone: typeof Package }, mobile = false) => {
    const badge = compterBadge(item.ecran)
    return (
      <button
        key={item.ecran}
        className={`nav-item${ecran === item.ecran ? ' actif' : ''}`}
        onClick={() => aller(item.ecran)}
        aria-current={ecran === item.ecran ? 'page' : undefined}
      >
        <item.Icone size={22} aria-hidden="true" />
        {item.libelle}
        {badge > 0 && <span className="badge-compteur" aria-label={`${badge} alertes`}>{badge}</span>}
        {mobile && null}
      </button>
    )
  }

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Navigation principale">
        <div className="logo"><Logo /></div>
        {NAV_PRINCIPALE.map((i) => navItem(i))}
        {NAV_SECONDAIRE.slice(0, 2).map((i) => navItem(i))}
        <div className="sidebar-bas">{navItem(NAV_SECONDAIRE[2])}</div>
      </nav>

      <div className="contenu">
        <header className="en-tete">
          <h1>{TITRES[ecran]}</h1>
          <span className="restaurant">{db.parametres.nomRestaurant}</span>
          <button className="btn btn-secondaire" onClick={onScanner}>
            <ScanLine size={20} aria-hidden="true" /> Scanner
          </button>
          <button
            className="btn icone btn-doux bouton-cloche"
            aria-label={`Notifications, ${nonLues} non lues`}
            aria-expanded={notifsOuvertes}
            onClick={() => setNotifsOuvertes((o) => !o)}
          >
            <Bell size={22} aria-hidden="true" />
            {nonLues > 0 && <span className="badge-compteur" style={{ position: 'absolute', top: 4, right: 4 }}>{nonLues}</span>}
          </button>
        </header>

        {notifsOuvertes && (
          <div className="panneau-notifs" role="region" aria-label="Centre de notifications">
            <div className="modale-entete">
              <h2 style={{ fontSize: 19 }}>Notifications</h2>
              <button className="btn btn-petit btn-doux" onClick={marquerToutLu}>
                <CheckCheck size={18} aria-hidden="true" /> Tout marquer comme lu
              </button>
              <button className="btn icone btn-doux" aria-label="Fermer les notifications" onClick={() => setNotifsOuvertes(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {db.notifications.length === 0 ? (
              <div className="etat-vide"><p>Aucune notification pour le moment.</p></div>
            ) : (
              db.notifications.slice(0, 30).map((n) => (
                <div key={n.id} className={`notif${n.lue ? '' : ' non-lue'}`}>
                  <p>{n.message}</p>
                  <button className="btn btn-petit btn-doux" onClick={() => { marquerLue(n.id); aller(n.cible as Ecran) }}>
                    Voir
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <main className="page">{children}</main>
      </div>

      <nav className="nav-mobile" aria-label="Navigation mobile">
        {NAV_PRINCIPALE.map((i) => navItem(i, true))}
        <button className="nav-item" onClick={() => setPlusOuvert(true)} aria-expanded={plusOuvert}>
          <MoreHorizontal size={24} aria-hidden="true" />
          Plus
        </button>
      </nav>

      {plusOuvert && (
        <div className="voile" onClick={(e) => { if (e.target === e.currentTarget) setPlusOuvert(false) }}>
          <div className="modale" role="dialog" aria-modal="true" aria-label="Autres écrans">
            <div className="modale-entete">
              <h2>Autres écrans</h2>
              <button className="btn icone btn-doux" aria-label="Fermer" onClick={() => setPlusOuvert(false)}>
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="modale-corps" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {NAV_SECONDAIRE.map((i) => (
                <button key={i.ecran} className="btn btn-lg btn-doux" style={{ justifyContent: 'flex-start' }} onClick={() => aller(i.ecran)}>
                  <i.Icone size={22} aria-hidden="true" /> {i.libelle}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
