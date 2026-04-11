import { useCallback } from 'react'
import { useConnect } from '@wallet-standard/react'
import type { UiWallet, UiWalletAccount } from '@wallet-standard/react'

interface Props {
  wallet: UiWallet
  onSelect: (account: UiWalletAccount) => void
}

export function WalletOption({ wallet, onSelect }: Props) {
  const [isConnecting, connect] = useConnect(wallet)

  const handleClick = useCallback(async () => {
    try {
      const accounts = await connect()
      if (accounts[0]) onSelect(accounts[0])
    } catch (err) {
      console.error('Wallet connect error:', err)
    }
  }, [connect, onSelect])

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-display
                 text-base-content hover:bg-primary/10 hover:text-primary
                 transition-colors disabled:opacity-40"
    >
      {wallet.icon && (
        <img src={wallet.icon} alt="" className="size-5 shrink-0" aria-hidden />
      )}
      <span className="truncate tracking-wider uppercase text-xs">
        {isConnecting ? 'Connecting…' : wallet.name}
      </span>
    </button>
  )
}
