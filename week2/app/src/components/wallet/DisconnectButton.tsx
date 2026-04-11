import { useDisconnect } from '@wallet-standard/react'
import type { UiWallet } from '@wallet-standard/react'

interface Props {
  wallet: UiWallet
  onDisconnect: () => void
}

export function DisconnectButton({ wallet, onDisconnect }: Props) {
  const [isDisconnecting, disconnect] = useDisconnect(wallet)

  return (
    <button
      onClick={async () => {
        try {
          await disconnect()
          onDisconnect()
        } catch (err) {
          console.error('Wallet disconnect error:', err)
        }
      }}
      disabled={isDisconnecting}
      className="w-full px-4 py-3 text-left text-xs uppercase tracking-wider
                 font-display text-error hover:bg-error/10 transition-colors
                 disabled:opacity-40"
    >
      {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
    </button>
  )
}
