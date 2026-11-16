import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  DB, Produit, MiseEnPlace, Fournisseur, Plat, Commande, HistoriquePerte, Notification, Parametres, ServiceRepas,
} from '../types'
import { dbDemo } from '../data/demoData'
import { aujourdhuiISO, afficherDate, libelleCompteARebours, ecartJours } from '../lib/dates'
import { estSauveParRappel, misesEnPlaceActives } from '../lib/rules'

const CLE_STOCKAGE = 'stocky_v1'
const VERSION_DB = 1

export interface Toast {
  id: number
  message: string
  type: 'succes' | 'info' | 'alerte'
  annuler?: () => void
}

interface StockyContext {
  db: DB
  toasts: Toast[]
  toast: (message: string, type?: Toast['type'], annuler?: () => void) => void
  fermerToast: (id: number) => void
  // produits
  ajouterProduit: (p: Omit<Produit, 'id'>) => Produit
  modifierProduit: (id: string, maj: Partial<Produit>) => void
  supprimerProduit: (id: string) => void
  utiliserProduit: (id: string) => void
  jeterProduit: (id: string, quantiteJetee: number) => void
  // mises en place
  ajouterMise: (m: Omit<MiseEnPlace, 'id' | 'statut'>) => void
  utiliserMise: (id: string) => void
  jeterMise: (id: string, quantiteJetee: number) => void
  // fournisseurs
  ajouterFournisseur: (f: Omit<Fournisseur, 'id'>) => void
  modifierFournisseur: (id: string, maj: Partial<Fournisseur>) => void
  supprimerFournisseur: (id: string) => void
  // plats et planning
  ajouterPlat: (p: Omit<Plat, 'id'>) => Plat
  modifierPlat: (id: string, maj: Partial<Plat>) => void
  majService: (date: string, service: 'midi' | 'soir', maj: Partial<ServiceRepas>) => void
  // commandes
  ajouterOuFusionnerCommande: (fournisseurId: string, lignes: Commande['lignes']) => string
  retirerLigneCommande: (commandeId: string, index: number) => void
  majLigneCommande: (commandeId: string, index: number, maj: Partial<Commande['lignes'][number]>) => void
  envoyerCommande: (commandeId: string) => void
  receptionnerCommande: (commandeId: string, photo?: string) => void
  supprimerCommande: (commandeId: string) => void
  // notifications
  marquerLue: (id: string) => void
  marquerToutLu: () => void
  // paramètres
  majParametres: (maj: Partial<Parametres>) => void
  reinitialiser: () => void
}

const Ctx = createContext<StockyContext | null>(null)

function chargerDB(): DB {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return dbDemo()
    const db = JSON.parse(brut) as DB
    if (!db || typeof db !== 'object' || !Array.isArray(db.produits)) throw new Error('format')
    return { ...dbDemo(), ...db, version: VERSION_DB }
  } catch {
    // JSON corrompu : on repart sur les données de démo plutôt que de planter
    return dbDemo()
  }
}

function sauvegarderDB(db: DB): boolean {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

let compteurId = 0
export function nouvelId(prefixe: string): string {
  compteurId += 1
  return `${prefixe}_${Date.now().toString(36)}${compteurId}`
}

// Génération automatique des rappels (sans doublons) depuis produits + mises en place
export function genererNotifications(db: DB): Notification[] {
  const delai = db.parametres.delaiAlerte
  const existantes = new Set(db.notifications.map((n) => n.id))
  const nouvelles: Notification[] = []

  const ajouter = (id: string, message: string, cible: string, type: Notification['type'] = 'alerte') => {
    if (existantes.has(id)) return
    existantes.add(id)
    nouvelles.push({ id, type, message, date: aujourdhuiISO(), lue: false, cible })
  }

  const produits = db.produits
  const nbPerimes = produits.filter((p) => ecartJours(p.datePeremption) < 0).length
  if (nbPerimes > 0) ajouter(`perimes-${aujourdhuiISO()}`, `${nbPerimes} produit${nbPerimes > 1 ? 's' : ''} ${nbPerimes > 1 ? 'sont' : 'est'} périmé${nbPerimes > 1 ? 's' : ''}`, 'stock')

  const bientot = produits.filter((p) => {
    const d = ecartJours(p.datePeremption)
    return d >= 0 && d <= delai
  })
  const demain = bientot.filter((p) => ecartJours(p.datePeremption) === 1)
  if (demain.length > 0) ajouter(`demain-${aujourdhuiISO()}`, `${demain.length} produit${demain.length > 1 ? 's' : ''} périme${demain.length > 1 ? 'nt' : ''} demain`, 'stock')

  for (const p of bientot) {
    ajouter(`prod-${p.id}-${p.datePeremption}`, `${p.nom} — ${libelleCompteARebours(p.datePeremption)}`, 'stock')
  }
  for (const m of misesEnPlaceActives(db.misesEnPlace)) {
    const d = ecartJours(m.dlc)
    if (d <= delai) {
      ajouter(`mise-${m.id}-${m.dlc}`, `Mise en place « ${m.nom} » — ${libelleCompteARebours(m.dlc)}`, 'preparations')
    }
  }
  return nouvelles
}

export function StockyProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(chargerDB)
  const [toasts, setToasts] = useState<Toast[]>([])
  const compteurToast = useRef(0)

  // Sauvegarde à chaque modification
  useEffect(() => {
    const ok = sauvegarderDB(db)
    if (!ok) {
      compteurToast.current += 1
      setToasts((t) => [...t, { id: compteurToast.current, message: 'Espace de stockage plein : les dernières modifications ne sont pas enregistrées.', type: 'alerte' }])
    }
  }, [db])

  // Génération des notifications au chargement puis toutes les minutes
  useEffect(() => {
    setDb((d) => {
      const nouvelles = genererNotifications(d)
      return nouvelles.length ? { ...d, notifications: [...nouvelles, ...d.notifications].slice(0, 80) } : d
    })
    const t = setInterval(() => {
      setDb((d) => {
        const nouvelles = genererNotifications(d)
        return nouvelles.length ? { ...d, notifications: [...nouvelles, ...d.notifications].slice(0, 80) } : d
      })
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const toast = useCallback((message: string, type: Toast['type'] = 'succes', annuler?: () => void) => {
    compteurToast.current += 1
    const id = compteurToast.current
    setToasts((t) => [...t.slice(-2), { id, message, type, annuler }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const fermerToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  // Méthode générique : appliquer une mutation avec toast + annulation possible
  const avecAnnulation = useCallback((mutateur: (d: DB) => DB, message: string, annulable: boolean) => {
    setDb((precedente) => {
      const suivante = mutateur(precedente)
      if (annulable) {
        compteurToast.current += 1
        const id = compteurToast.current
        setToasts((t) => [...t.slice(-2), { id, message, type: 'succes', annuler: () => setDb(precedente) }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
      } else {
        toast(message)
      }
      return suivante
    })
  }, [toast])

  const ctx = useMemo<StockyContext>(() => {
    const enregistrerPerte = (d: DB, item: { nom: string; categorie: string; quantite: number; prixUnitaire: number; datePeremption: string }, quantite: number, motif: 'jete' | 'utilise'): DB => {
      const perte: HistoriquePerte = {
        id: nouvelId('h'),
        date: aujourdhuiISO(),
        produitNom: item.nom,
        categorie: item.categorie,
        quantite,
        valeur: Math.round(quantite * item.prixUnitaire * 100) / 100,
        motif,
        sauveParRappel: motif === 'utilise' && estSauveParRappel(item.datePeremption, d.parametres.delaiAlerte),
      }
      return { ...d, historique: [perte, ...d.historique] }
    }

    return {
      db,
      toasts,
      toast,
      fermerToast,

      ajouterProduit: (p) => {
        const produit: Produit = { ...p, id: nouvelId('p') }
        setDb((d) => ({ ...d, produits: [produit, ...d.produits] }))
        toast(`« ${p.nom} » ajouté au stock`)
        return produit
      },

      modifierProduit: (id, maj) => {
        setDb((d) => ({ ...d, produits: d.produits.map((p) => (p.id === id ? { ...p, ...maj } : p)) }))
        toast('Produit mis à jour')
      },

      supprimerProduit: (id) => {
        avecAnnulation(
          (d) => ({ ...d, produits: d.produits.filter((p) => p.id !== id) }),
          'Produit supprimé',
          false,
        )
      },

      utiliserProduit: (id) => {
        avecAnnulation(
          (d) => {
            const p = d.produits.find((x) => x.id === id)
            if (!p) return d
            const suivant = enregistrerPerte(d, p, p.quantite, 'utilise')
            return { ...suivant, produits: suivant.produits.filter((x) => x.id !== id) }
          },
          'Produit marqué comme utilisé',
          true,
        )
      },

      jeterProduit: (id, quantiteJetee) => {
        avecAnnulation(
          (d) => {
            const p = d.produits.find((x) => x.id === id)
            if (!p) return d
            let suivant = enregistrerPerte(d, p, quantiteJetee, 'jete')
            const reste = Math.round((p.quantite - quantiteJetee) * 1000) / 1000
            suivant = {
              ...suivant,
              produits: reste > 0
                ? suivant.produits.map((x) => (x.id === id ? { ...x, quantite: reste } : x))
                : suivant.produits.filter((x) => x.id !== id),
            }
            return suivant
          },
          `${quantiteJetee} jeté`,
          true,
        )
      },

      ajouterMise: (m) => {
        setDb((d) => ({
          ...d,
          misesEnPlace: [{ ...m, id: nouvelId('m'), statut: 'active' }, ...d.misesEnPlace],
          parametres: d.parametres.auteurs.includes(m.auteur) || !m.auteur
            ? d.parametres
            : { ...d.parametres, auteurs: [...d.parametres.auteurs, m.auteur] },
        }))
        toast(`Mise en place « ${m.nom} » créée`)
      },

      utiliserMise: (id) => {
        avecAnnulation(
          (d) => {
            const m = d.misesEnPlace.find((x) => x.id === id)
            if (!m) return d
            const perte: HistoriquePerte = {
              id: nouvelId('h'), date: aujourdhuiISO(), produitNom: m.nom, categorie: 'Mise en place',
              quantite: m.quantite, valeur: 0, motif: 'utilise',
              sauveParRappel: estSauveParRappel(m.dlc, d.parametres.delaiAlerte),
            }
            return {
              ...d,
              historique: [perte, ...d.historique],
              misesEnPlace: d.misesEnPlace.map((x) => (x.id === id ? { ...x, statut: 'utilisee' as const } : x)),
            }
          },
          'Mise en place marquée comme utilisée',
          true,
        )
      },

      jeterMise: (id, quantiteJetee) => {
        avecAnnulation(
          (d) => {
            const m = d.misesEnPlace.find((x) => x.id === id)
            if (!m) return d
            const perte: HistoriquePerte = {
              id: nouvelId('h'), date: aujourdhuiISO(), produitNom: m.nom, categorie: 'Mise en place',
              quantite: quantiteJetee, valeur: 0, motif: 'jete', sauveParRappel: false,
            }
            const reste = Math.round((m.quantite - quantiteJetee) * 1000) / 1000
            return {
              ...d,
              historique: [perte, ...d.historique],
              misesEnPlace: reste > 0
                ? d.misesEnPlace.map((x) => (x.id === id ? { ...x, quantite: reste } : x))
                : d.misesEnPlace.map((x) => (x.id === id ? { ...x, statut: 'jetee' as const } : x)),
            }
          },
          'Mise en place jetée',
          true,
        )
      },

      ajouterFournisseur: (f) => {
        setDb((d) => ({ ...d, fournisseurs: [...d.fournisseurs, { ...f, id: nouvelId('f') }] }))
        toast(`Fournisseur « ${f.nom} » ajouté`)
      },

      modifierFournisseur: (id, maj) => {
        setDb((d) => ({ ...d, fournisseurs: d.fournisseurs.map((f) => (f.id === id ? { ...f, ...maj } : f)) }))
        toast('Fournisseur mis à jour')
      },

      supprimerFournisseur: (id) => {
        setDb((d) => ({ ...d, fournisseurs: d.fournisseurs.filter((f) => f.id !== id) }))
        toast('Fournisseur supprimé')
      },

      ajouterPlat: (p) => {
        const plat: Plat = { ...p, id: nouvelId('r') }
        setDb((d) => ({ ...d, plats: [...d.plats, plat] }))
        toast(`Plat « ${p.nom} » ajouté`)
        return plat
      },

      modifierPlat: (id, maj) => {
        setDb((d) => ({ ...d, plats: d.plats.map((p) => (p.id === id ? { ...p, ...maj } : p)) }))
        toast('Plat mis à jour')
      },

      majService: (date, service, maj) => {
        setDb((d) => {
          const services = [...d.planning.services]
          const idx = services.findIndex((s) => s.date === date && s.service === service)
          if (idx >= 0) services[idx] = { ...services[idx], ...maj }
          else services.push({ date, service, plats: [], couverts: 30, ...maj })
          return { ...d, planning: { ...d.planning, services } }
        })
      },

      ajouterOuFusionnerCommande: (fournisseurId, lignes) => {
        let idCommande = ''
        setDb((d) => {
          const existante = d.commandes.find((c) => c.fournisseurId === fournisseurId && c.statut === 'preparation')
          let commandes: Commande[]
          if (existante) {
            idCommande = existante.id
            const lignesFusionnees = [...existante.lignes]
            for (const l of lignes) {
              const idx = lignesFusionnees.findIndex((x) => x.produit === l.produit && x.unite === l.unite)
              if (idx >= 0) lignesFusionnees[idx] = { ...lignesFusionnees[idx], quantite: lignesFusionnees[idx].quantite + l.quantite }
              else lignesFusionnees.push(l)
            }
            commandes = d.commandes.map((c) => (c.id === existante.id ? { ...c, lignes: lignesFusionnees } : c))
          } else {
            idCommande = nouvelId('c')
            commandes = [...d.commandes, { id: idCommande, fournisseurId, lignes, statut: 'preparation', dateCreation: aujourdhuiISO() }]
          }
          return { ...d, commandes }
        })
        return idCommande
      },

      retirerLigneCommande: (commandeId, index) => {
        setDb((d) => ({
          ...d,
          commandes: d.commandes.map((c) => (c.id === commandeId ? { ...c, lignes: c.lignes.filter((_, i) => i !== index) } : c)),
        }))
        toast('Ligne retirée de la commande')
      },

      majLigneCommande: (commandeId, index, maj) => {
        setDb((d) => ({
          ...d,
          commandes: d.commandes.map((c) =>
            c.id === commandeId
              ? { ...c, lignes: c.lignes.map((l, i) => (i === index ? { ...l, ...maj } : l)) }
              : c,
          ),
        }))
      },

      envoyerCommande: (commandeId) => {
        setDb((d) => ({
          ...d,
          commandes: d.commandes.map((c) => (c.id === commandeId ? { ...c, statut: 'envoyee', dateEnvoi: aujourdhuiISO() } : c)),
        }))
        toast(`Commande envoyée le ${afficherDate(aujourdhuiISO())}`)
      },

      receptionnerCommande: (commandeId, photo) => {
        setDb((d) => ({
          ...d,
          commandes: d.commandes.map((c) =>
            c.id === commandeId
              ? { ...c, statut: 'recue' as const, dateReception: aujourdhuiISO(), photoBon: photo ?? c.photoBon }
              : c,
          ),
        }))
        toast(`Réception validée le ${afficherDate(aujourdhuiISO())} : produits ajoutés au stock`)
      },

      supprimerCommande: (commandeId) => {
        setDb((d) => ({ ...d, commandes: d.commandes.filter((c) => c.id !== commandeId) }))
        toast('Commande supprimée')
      },

      marquerLue: (id) => {
        setDb((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, lue: true } : n)) }))
      },

      marquerToutLu: () => {
        setDb((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, lue: true })) }))
      },

      majParametres: (maj) => {
        setDb((d) => ({ ...d, parametres: { ...d.parametres, ...maj } }))
      },

      reinitialiser: () => {
        const demo = dbDemo()
        setDb({ ...demo, notifications: genererNotifications(demo) })
        toast('Données de démo réinitialisées')
      },
    }
  }, [db, toasts, toast, fermerToast, avecAnnulation])

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}

export function useStocky(): StockyContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStocky doit être utilisé dans StockyProvider')
  return ctx
}
