import { createContext, useState } from 'react'
import type { UiWalletAccount } from '@wallet-standard/react'

type ContextValue = [
  UiWalletAccount | undefined,
  React.Dispatch<React.SetStateAction<UiWalletAccount | undefined>>,
]

export const SelectedWalletAccountContext = createContext<ContextValue>([
  undefined,
  () => {},
])

export function SelectedWalletAccountProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const state = useState<UiWalletAccount | undefined>(undefined)
  return (
    <SelectedWalletAccountContext.Provider value={state}>
      {children}
    </SelectedWalletAccountContext.Provider>
  )
}
