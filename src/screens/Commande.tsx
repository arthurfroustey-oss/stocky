import { useRef, useState } from 'react'
import { Send, Trash2, ChevronDown, ChevronUp, PackageCheck, ImagePlus, ZoomIn, ZoomOut } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Commande, Produit } from '../types'
import { Modal } from '../components/Modal'
import { Stepper } from '../components/Stepper'
import { ConfirmDialog } from '../components/Modal'
import { afficherDate, ajouterJours, aujourdhuiISO } from '../lib/dates'
import { dlcDefaut } from '../lib/rules'
import { euro } from '../lib/format'

function categorieDe(produitNom: string, db: { produits: Produit[] }): string {
  return db.produits.find((p) => p.nom === produitNom)?.categorie ?? 'Épicerie'
}

const LIBELLES_STATUT: Record<Commande['statut'], string> = {
  preparation: 'En préparation',
  envoyee: 'Envoyée',
  recue: 'Reçue',
}

export function CommandeScreen() {
  const { db, retirerLigneCommande, majLigneCommande, envoyerCommande, supprimerCommande, toast } = useStocky()
  const [filtre, setFiltre] = useState<'tous' | Commande['statut']>('tous')
  const [detail, setDetail] = useState<string | null>(null)
  const [reception, setReception] = useState<Commande | null>(null)
  const [suppression, setSuppression] = useState<Commande | null>(null)

  const enPreparation = db.commandes.filter((c) => c.statut === 'preparation')
  const historique = db.commandes
    .filter((c) => c.statut !== 'preparation' && (filtre === 'tous' || c.statut === filtre))
    .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))

  const nomFournisseur = (id: string) => db.fournisseurs.find((f) => f.id === id)?.nom ?? 'Fournisseur inconnu'
  const emailFournisseur = (id: string) => db.fournisseurs.find((f) => f.id === id)?.email ?? ''

  const envoyer = (c: Commande) => {
    const objet = encodeURIComponent(`Commande ${db.parametres.nomRestaurant} du ${afficherDate(aujourdhuiISO())}`)
    const corps = encodeURIComponent(
      `Bonjour,\n\nVoici notre commande :\n\n${c.lignes.map((l) => `${l.produit} : ${l.quantite} ${l.unite}`).join('\n')}\n\nMerci,\n${db.parametres.nomRestaurant}`,
    )
    window.location.href = `mailto:${emailFournisseur(c.fournisseurId)}?subject=${objet}&body=${corps}`
    envoyerCommande(c.id)
  }

  const totalCommande = (c: Commande) => c.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  const ligneCommandeVue = (c: Commande, editable: boolean) => (
    c.lignes.map((l, i) => (
      <div key={i} className="ligne-alerte" style={{ marginBottom: 8 }}>
        <div className="infos">
          <div className="nom">{l.produit}</div>
          <div className="details">{euro(l.prixUnitaire)} / {l.unite}</div>
        </div>
        {editable ? (
          <>
            <Stepper label={`la quantité de ${l.produit}`} valeur={l.quantite} unite={l.unite} min={0}
              onChange={(n) => majLigneCommande(c.id, i, { quantite: n })} />
            <span style={{ fontWeight: 700, minWidth: 90, textAlign: 'right' }}>{euro(l.quantite * l.prixUnitaire)}</span>
            <button className="btn icone btn-danger" aria-label={`Retirer ${l.produit}`} onClick={() => retirerLigneCommande(c.id, i)}>
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <span style={{ fontWeight: 700 }}>{l.quantite} {l.unite} · {euro(l.quantite * l.prixUnitaire)}</span>
        )}
      </div>
    ))
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section aria-label="Panier">
        <h2 style={{ marginBottom: 10 }}>Panier</h2>
        {enPreparation.length === 0 ? (
          <div className="carte etat-vide">
            <p style={{ fontWeight: 700, fontSize: 19, margin: 0 }}>Aucune commande en préparation</p>
            <p style={{ margin: 0 }}>Générez une commande depuis le menu de la semaine.</p>
          </div>
        ) : (
          enPreparation.map((c) => (
            <div key={c.id} className="carte" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="rangée-actions">
                <h3 style={{ flex: 1 }}>{nomFournisseur(c.fournisseurId)}</h3>
                <span className="badge badge-bientot">{LIBELLES_STATUT[c.statut]}</span>
                <span className="totale-commande">{euro(totalCommande(c))}</span>
                <button className="btn btn-primaire btn-lg" onClick={() => envoyer(c)}>
                  <Send size={20} aria-hidden="true" /> Envoyer la commande
                </button>
              </div>
              {ligneCommandeVue(c, true)}
            </div>
          ))
        )}
      </section>

      <section aria-label="Historique des commandes">
        <h2 style={{ marginBottom: 10 }}>Historique</h2>
        <div className="filtre-ligne" role="group" aria-label="Filtre par statut">
          {(['tous', 'preparation', 'envoyee', 'recue'] as const).map((s) => (
            <button key={s} className={`pastille${filtre === s ? ' activee' : ''}`} aria-pressed={filtre === s} onClick={() => setFiltre(s)}>
              {s === 'tous' ? 'Tous' : LIBELLES_STATUT[s]}
            </button>
          ))}
        </div>
        {historique.length === 0 ? (
          <div className="carte etat-vide"><p>Aucune commande dans l'historique pour ce filtre.</p></div>
        ) : (
          historique.map((c) => (
            <div key={c.id} className="carte" style={{ marginBottom: 10 }}>
              <div className="rangée-actions">
                <strong style={{ flex: 1, fontSize: 19 }}>{nomFournisseur(c.fournisseurId)}</strong>
                <span className={`badge ${c.statut === 'recue' ? 'badge-ok' : 'badge-bientot'}`}>{LIBELLES_STATUT[c.statut]}</span>
                <span className="aide">Créée le {afficherDate(c.dateCreation)} · {euro(totalCommande(c))}</span>
                <button className="btn btn-petit btn-doux" aria-expanded={detail === c.id} onClick={() => setDetail(detail === c.id ? null : c.id)}>
                  {detail === c.id ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />} Détail
                </button>
                {c.statut === 'envoyee' && (
                  <button className="btn btn-primaire" onClick={() => setReception(c)}>
                    <PackageCheck size={18} aria-hidden="true" /> Réceptionner
                  </button>
                )}
                {c.statut !== 'preparation' && (
                  <button className="btn icone btn-danger" aria-label={`Supprimer la commande de ${nomFournisseur(c.fournisseurId)}`} onClick={() => setSuppression(c)}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              {detail === c.id && (
                <div style={{ marginTop: 10 }}>
                  {ligneCommandeVue(c, false)}
                  {c.photoBon && <img src={c.photoBon} alt="Photo du bon de livraison" className="photo-bon" style={{ maxWidth: 200 }} />}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {reception && (
        <Modal titre={`Réception : ${nomFournisseur(reception.fournisseurId)}`} onFermer={() => setReception(null)} large>
          <ReceptionForm
            commande={reception}
            onFermer={() => setReception(null)}
          />
        </Modal>
      )}
      {suppression && (
        <ConfirmDialog
          titre="Supprimer la commande"
          message={`Supprimer définitivement la commande ${LIBELLES_STATUT[suppression.statut]} chez ${nomFournisseur(suppression.fournisseurId)} ?`}
          confirmer={() => { supprimerCommande(suppression.id); toast('Commande supprimée') }}
          onFermer={() => setSuppression(null)}
        />
      )}
    </div>
  )
}

// Écran de réception : quantités reçues, DLC proposée, lieu, photo du bon → alimente le stock
function ReceptionForm({ commande, onFermer }: { commande: Commande; onFermer: () => void }) {
  const { db, ajouterProduit, toast, receptionnerCommande } = useStocky()
  const [quantites, setQuantites] = useState<number[]>(commande.lignes.map((l) => l.quantite))
  const [dlcs, setDlcs] = useState<string[]>(commande.lignes.map((l) => dlcDefaut(categorieDe(l.produit, db), db.parametres.categories)))
  const [lieux, setLieux] = useState<string[]>(commande.lignes.map(() => db.parametres.lieux[0]))
  const [photo, setPhoto] = useState<string | null>(commande.photoBon ?? null)
  const [zoom, setZoom] = useState(1)
  const fichierRef = useRef<HTMLInputElement>(null)

  const choisirPhoto = (fichier: File) => {
    const lecteur = new FileReader()
    lecteur.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Miniature compressée (max 800 px) pour ménager le localStorage
        const max = 800
        const echelle = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * echelle)
        canvas.height = Math.round(img.height * echelle)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setPhoto(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = String(lecteur.result)
    }
    lecteur.readAsDataURL(fichier)
  }

  const valider = () => {
    for (let i = 0; i < commande.lignes.length; i++) {
      if (quantites[i] > 0 && !dlcs[i]) {
        toast(`Renseignez la date de péremption de « ${commande.lignes[i].produit} ».`, 'alerte')
        return
      }
    }
    for (let i = 0; i < commande.lignes.length; i++) {
      const l = commande.lignes[i]
      if (quantites[i] <= 0) continue
      const modele = db.produits.find((p) => p.nom === l.produit)
      const nouveau: Omit<Produit, 'id'> = {
        nom: l.produit,
        categorie: modele?.categorie ?? 'Épicerie',
        quantite: quantites[i],
        unite: l.unite,
        lieu: lieux[i],
        fournisseurId: commande.fournisseurId,
        dateReception: aujourdhuiISO(),
        datePeremption: dlcs[i],
        prixUnitaire: l.prixUnitaire,
        codeBarres: modele?.codeBarres,
      }
      ajouterProduit(nouveau)
    }
    receptionnerCommande(commande.id, photo ?? undefined)
    onFermer()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      <div>
        {commande.lignes.map((l, i) => {
          const categorie = db.produits.find((p) => p.nom === l.produit)?.categorie ?? 'Épicerie'
          return (
            <div key={i} className="carte" style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ fontSize: 19 }}>{l.produit}</strong>
              <div className="rangée-actions">
                <span className="aide">Reçu :</span>
                <Stepper label={`la quantité reçue de ${l.produit}`} valeur={quantites[i]} unite={l.unite} min={0} onChange={(n) => setQuantites(quantites.map((q, j) => (j === i ? n : q)))} />
              </div>
              <div className="champ" style={{ marginBottom: 0 }}>
                <label htmlFor={`dlc-${i}`}>Date de péremption</label>
                <input id={`dlc-${i}`} type="date" value={dlcs[i]} onChange={(e) => setDlcs(dlcs.map((d, j) => (j === i ? e.target.value : d)))} />
                <div className="groupe-pastilles" role="group" aria-label={`Durée rapide pour ${l.produit}`}>
                  {[1, 2, 3, 5, 7].map((j) => (
                    <button key={j} type="button" className="pastille" onClick={() => setDlcs(dlcs.map((d, k) => (k === i ? ajouterJours(aujourdhuiISO(), j) : d)))}>
                      J+{j}
                    </button>
                  ))}
                </div>
                <span className="aide">Défaut « {categorie} » : {afficherDate(dlcDefaut(categorie, db.parametres.categories))}</span>
              </div>
              <div className="champ" style={{ marginBottom: 0 }}>
                <label id={`lieu-${i}`}>Lieu de stockage</label>
                <div className="groupe-pastilles" role="group" aria-labelledby={`lieu-${i}`}>
                  {db.parametres.lieux.map((lieu) => (
                    <button key={lieu} type="button" className={`pastille${lieux[i] === lieu ? ' activee' : ''}`} aria-pressed={lieux[i] === lieu}
                      onClick={() => setLieux(lieux.map((x, j) => (j === i ? lieu : x)))}>
                      {lieu}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        <div className="modale-pied" style={{ padding: 0 }}>
          <button className="btn btn-secondaire" onClick={onFermer}>Annuler</button>
          <button className="btn btn-primaire btn-lg" onClick={valider}>
            <PackageCheck size={20} aria-hidden="true" /> Valider la réception
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8 }}>Photo du bon de livraison</h3>
        <input
          ref={fichierRef} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) choisirPhoto(f) }}
        />
        <button className="btn btn-secondaire btn-lg" onClick={() => fichierRef.current?.click()}>
          <ImagePlus size={20} aria-hidden="true" /> {photo ? 'Changer la photo' : 'Prendre / choisir une photo'}
        </button>
        {photo && (
          <div style={{ marginTop: 10, overflow: 'auto', maxHeight: 380 }}>
            <img src={photo} alt="Bon de livraison" className="photo-bon" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} onClick={() => setZoom(zoom === 1 ? 1.6 : 1)} />
            <div className="rangée-actions" style={{ marginTop: 8 }}>
              <button className="btn icone btn-doux" aria-label="Zoomer" onClick={() => setZoom(Math.min(3, zoom + 0.3))}><ZoomIn size={18} aria-hidden="true" /></button>
              <button className="btn icone btn-doux" aria-label="Dézoomer" onClick={() => setZoom(Math.max(1, zoom - 0.3))}><ZoomOut size={18} aria-hidden="true" /></button>
            </div>
          </div>
        )}
        <p className="aide" style={{ marginTop: 8 }}>Aucune lecture automatique : la photo sert de justificatif à consulter pendant la réception.</p>
      </div>
    </div>
  )
}
