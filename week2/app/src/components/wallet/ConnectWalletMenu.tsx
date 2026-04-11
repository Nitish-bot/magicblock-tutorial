import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { StandardConnect, StandardDisconnect } from '@wallet-standard/core'
import {
  useWallets,
  uiWalletAccountBelongsToUiWallet,
} from '@wallet-standard/react'
import type { UiWalletAccount } from '@wallet-standard/react'
import { Wallet, CaretDown } from '@phosphor-icons/react'

import { SelectedWalletAccountContext } from '@/context/SelectedWalletAccountContext'
import { WalletOption } from './WalletOption'
import { DisconnectButton } from './DisconnectButton'

function truncate(addr: string) {
  return `${addr.slice(0, 4)}..${addr.slice(-4)}`
}

export function ConnectWalletMenu() {
  const wallets = useWallets()
  const [selectedAccount, setSelectedAccount] = useContext(SelectedWalletAccountContext)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const connectableWallets = wallets.filter(
    (w) =>
      w.features.includes(StandardConnect) &&
      w.features.includes(StandardDisconnect) &&
      w.chains.some((c) => c.startsWith('solana:')),
  )

  const ownerWallet = selectedAccount
    ? wallets.find((w) => uiWalletAccountBelongsToUiWallet(selectedAccount, w))
    : undefined

  const handleSelect = useCallback(
    (account: UiWalletAccount) => {
      setSelectedAccount(account)
      setIsOpen(false)
    },
    [setSelectedAccount],
  )

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="btn btn-sm btn-outline border-primary text-primary
                   hover:bg-primary hover:text-primary-content
                   font-display tracking-widest uppercase text-xs gap-2"
      >
        <Wallet size={14} weight="fill" />
        {selectedAccount ? truncate(selectedAccount.address) : 'Connect'}
        <CaretDown
          size={10}
          weight="bold"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-56 glass-surface
                     border border-base-content/10 rounded-box shadow-2xl overflow-hidden"
        >
          {selectedAccount && ownerWallet ? (
            <>
              <div className="px-4 py-3 border-b border-base-content/10">
                <p className="text-muted text-xs uppercase tracking-wider font-display">
                  Connected
                </p>
                <p className="text-secondary text-sm font-display mt-1 tracking-wide">
                  {selectedAccount.address.slice(0, 8)}…
                  {selectedAccount.address.slice(-8)}
                </p>
              </div>
              <DisconnectButton
                wallet={ownerWallet}
                onDisconnect={() => {
                  setSelectedAccount(undefined)
                  setIsOpen(false)
                }}
              />
            </>
          ) : connectableWallets.length === 0 ? (
            <div className="px-4 py-4 text-muted text-xs font-display uppercase tracking-wider">
              No wallets detected
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-base-content/10">
                <p className="text-muted text-xs uppercase tracking-wider font-display">
                  Select Wallet
                </p>
              </div>
              {connectableWallets.map((wallet) => (
                <WalletOption
                  key={wallet.name}
                  wallet={wallet}
                  onSelect={handleSelect}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
