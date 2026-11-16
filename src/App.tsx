import { useState } from 'react'
import { StockyProvider } from './store/store'
import { Layout } from './components/Layout'
import type { Ecran } from './components/Layout'
import { Toasts } from './components/Toasts'
import { Dashboard } from './screens/Dashboard'
import { Stock } from './screens/Stock'
import { MisesEnPlace } from './screens/MisesEnPlace'
import { MenuSemaine } from './screens/MenuSemaine'
import { CommandeScreen } from './screens/Commande'
import { Fournisseurs } from './screens/Fournisseurs'
import { Statistiques } from './screens/Statistiques'
import { Parametres } from './screens/Parametres'
import { Scan } from './screens/Scan'
import { Modal } from './components/Modal'
import { ProductForm } from './components/ProductForm'
import type { Produit } from './types'

export default function App() {
  return (
    <StockyProvider>
      <Application />
      <Toasts />
    </StockyProvider>
  )
}

function Application() {
  const [ecran, setEcran] = useState<Ecran>('dashboard')
  const [scanOuvert, setScanOuvert] = useState(false)
  const [formScan, setFormScan] = useState<{ initial: Partial<Produit>; titre: string } | null>(null)

  const resultatScan = (code: string, produit?: Produit) => {
    setScanOuvert(false)
    if (produit) {
      setFormScan({ initial: produit, titre: `Produit reconnu : ${produit.nom}` })
    } else {
      setFormScan({ initial: { codeBarres: code }, titre: 'Nouveau produit scanné' })
    }
  }

  return (
    <>
      <Layout ecran={ecran} setEcran={setEcran} onScanner={() => setScanOuvert(true)}>
        {ecran === 'dashboard' && <Dashboard setEcran={setEcran} />}
        {ecran === 'stock' && <Stock />}
        {ecran === 'preparations' && <MisesEnPlace />}
        {ecran === 'menu' && <MenuSemaine />}
        {ecran === 'commande' && <CommandeScreen />}
        {ecran === 'fournisseurs' && <Fournisseurs />}
        {ecran === 'stats' && <Statistiques />}
        {ecran === 'parametres' && <Parametres />}
      </Layout>

      {scanOuvert && (
        <Scan onResultat={resultatScan} onFermer={() => setScanOuvert(false)} />
      )}

      {formScan && (
        <Modal titre={formScan.titre} onFermer={() => setFormScan(null)}>
          <ProductForm initial={formScan.initial} onFermer={() => setFormScan(null)} />
        </Modal>
      )}
    </>
  )
}
