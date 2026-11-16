// Logo Stocky recréé en SVG (aucune image externe)
export function LogoIcone({ taille = 36 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1F7A4D" />
      <path d="M24 8c6 0 10 4 10 9-6 1-10-2-10-9z" fill="#B9E4A8" />
      <rect x="13" y="20" width="22" height="17" rx="3" fill="none" stroke="white" strokeWidth="2.5" />
      <path d="M13 26h22" stroke="white" strokeWidth="2.5" />
      <path d="M22 23h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <LogoIcone taille={compact ? 32 : 38} />
      {!compact && <span className="mot">stocky</span>}
    </span>
  )
}
