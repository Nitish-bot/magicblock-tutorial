import { Link, useParams } from 'react-router-dom'
import { Sword } from '@phosphor-icons/react'
import { ConnectWalletMenu } from '@/components/wallet/ConnectWalletMenu'

export function Header() {
  const { gameId } = useParams<{ gameId?: string }>()

  return (
    <header className="navbar px-4 md:px-8 border-b border-base-content/7 bg-base-100/80 backdrop-blur-md sticky top-0 z-40">
      <div className="navbar-start">
        <Link
          to="/"
          className="flex items-center gap-2 text-primary font-display font-bold text-lg tracking-widest uppercase hover:text-primary/80 transition-colors"
        >
          <Sword size={20} weight="fill" />
          <span>RPS</span>
        </Link>
      </div>

      <div className="navbar-center">
        {gameId && (
          <div className="badge badge-outline badge-primary font-display text-xs tracking-widest uppercase">
            Game #{gameId}
          </div>
        )}
      </div>

      <div className="navbar-end">
        <nav className="flex items-center gap-4 mr-4">
          <Link
            to="/leaderboard"
            className="text-muted hover:text-base-content transition-colors text-xs uppercase tracking-wider font-display hidden sm:block"
          >
            Leaderboard
          </Link>
        </nav>
        <ConnectWalletMenu />
      </div>
    </header>
  )
}
