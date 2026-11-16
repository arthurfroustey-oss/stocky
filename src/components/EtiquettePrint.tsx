import { useEffect } from 'react'
import { LogoIcone } from './Logo'
import { afficherDate } from '../lib/dates'

// Étiquette imprimable (~60 × 40 mm) déclenchée via window.print()
export function EtiquettePrint({ etiquette, onFermer }: {
  etiquette: { nom: string; dateFabrication: string; dlc: string; auteur: string; lieu: string }
  onFermer: () => void
}) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.print()
      onFermer()
    }, 80)
    return () => clearTimeout(t)
  }, [onFermer])

  return (
    <div className="zone-impression" aria-hidden="true">
      <div className="etiquette">
        <div className="titre">
          <svg className="logo-etiquette" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="#1F7A4D" />
            <path d="M24 8c6 0 10 4 10 9-6 1-10-2-10-9z" fill="#B9E4A8" />
            <rect x="13" y="20" width="22" height="17" rx="3" fill="none" stroke="white" strokeWidth="2.5" />
            <path d="M13 26h22" stroke="white" strokeWidth="2.5" />
          </svg>
          <span>{etiquette.nom}</span>
        </div>
        <div className="ligne"><span>Fabriqué le</span><span>{afficherDate(etiquette.dateFabrication)}</span></div>
        <div className="ligne"><span>Par</span><span>{etiquette.auteur}</span></div>
        <div className="ligne"><span>Lieu</span><span>{etiquette.lieu}</span></div>
        <div className="ligne dlc"><span>DLC</span><span>{afficherDate(etiquette.dlc)}</span></div>
      </div>
    </div>
  )
}
