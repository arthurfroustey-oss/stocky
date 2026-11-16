import { useEffect, useRef, useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import { useStocky } from '../store/store'
import type { Produit } from '../types'

// Scan de code-barres : API BarcodeDetector si disponible, sinon ZXing.
// La caméra exige HTTPS (ou localhost) : message clair sinon, avec saisie manuelle en repli.
export function Scan({ onResultat, onFermer }: {
  onResultat: (code: string, produit?: Produit) => void
  onFermer: () => void
}) {
  const { db } = useStocky()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [manuel, setManuel] = useState(false)
  const [codeManuel, setCodeManuel] = useState('')

  useEffect(() => {
    let flux: MediaStream | null = null
    let annule = false
    let interval: ReturnType<typeof setInterval> | undefined

    const demarrer = async () => {
      if (!window.isSecureContext) {
        setErreur('La caméra nécessite une connexion sécurisée (HTTPS). Utilisez la saisie manuelle du code.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setErreur('Aucune caméra accessible sur cet appareil. Utilisez la saisie manuelle du code.')
        return
      }
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (annule) { flux.getTracks().forEach((t) => t.stop()); return }
        if (videoRef.current) {
          videoRef.current.srcObject = flux
          await videoRef.current.play()
        }
        await scanner()
      } catch (e) {
        const err = e as DOMException
        if (err.name === 'NotAllowedError') setErreur("Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur, ou saisissez le code manuellement.")
        else setErreur('Caméra indisponible. Utilisez la saisie manuelle du code.')
      }
    }

    const chercherProduit = (code: string) => {
      const produit = db.produits.find((p) => p.codeBarres === code)
      onResultat(code, produit)
    }

    const scanner = async () => {
      const video = videoRef.current
      if (!video) return
      if ('BarcodeDetector' in window) {
        type Detecteur = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }
        const Constructeur = (window as unknown as { BarcodeDetector: new (options?: { formats?: string[] }) => Detecteur }).BarcodeDetector
        const detecteur: Detecteur = new Constructeur({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'] })
        interval = setInterval(async () => {
          try {
            const codes = await detecteur.detect(video)
            if (codes.length > 0) {
              stopper()
              chercherProduit(codes[0].rawValue)
            }
          } catch { /* image pas encore prête : on réessaie */ }
        }, 400)
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const lecteur = new BrowserMultiFormatReader()
        lecteur.decodeFromVideoElement(video, (resultat) => {
          if (resultat && !annule) {
            stopper()
            chercherProduit(resultat.getText())
          }
        })
      }
    }

    const stopper = () => {
      if (interval) clearInterval(interval)
      flux?.getTracks().forEach((t) => t.stop())
    }

    demarrer()
    return () => { annule = true; stopper() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validerManuel = () => {
    const code = codeManuel.trim()
    if (!code) return
    onResultat(code, db.produits.find((p) => p.codeBarres === code))
  }

  return (
    <div className="scan-plein" role="dialog" aria-modal="true" aria-label="Scanner un code-barres">
      <video ref={videoRef} muted playsInline aria-hidden="true" style={erreur ? { display: 'none' } : undefined} />
      {!erreur && !manuel && <div className="scan-cadre" aria-hidden="true" />}
      {erreur && (
        <p className="scan-message" role="alert">
          <strong>Scan impossible.</strong><br />{erreur}
        </p>
      )}
      {erreur && !manuel && (
        <button className="btn btn-primaire btn-lg" onClick={() => setManuel(true)}>
          <Keyboard size={22} aria-hidden="true" /> Saisir le code manuellement
        </button>
      )}
      {manuel && (
        <div className="scan-message" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <label htmlFor="code-manuel" style={{ fontWeight: 700 }}>Code-barres</label>
          <input
            id="code-manuel"
            inputMode="numeric"
            value={codeManuel}
            onChange={(e) => setCodeManuel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') validerManuel() }}
            style={{ fontSize: 24, padding: '10px 16px', borderRadius: 10, border: '2px solid var(--vert-clair)', width: 280, textAlign: 'center' }}
            placeholder="Ex. 3401234000017"
          />
          <button className="btn btn-primaire btn-lg" onClick={validerManuel}>Rechercher ce code</button>
        </div>
      )}
      <div className="scan-actions">
        <button className="btn btn-lg" style={{ background: '#fff', color: 'var(--vert-fonce)' }} onClick={() => { onFermer() }}>
          <X size={22} aria-hidden="true" /> Annuler
        </button>
      </div>
    </div>
  )
}
