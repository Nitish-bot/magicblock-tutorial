import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'

import { SelectedWalletAccountProvider } from '@/context/SelectedWalletAccountContext'
import { BlockchainServiceContext } from '@/context/BlockchainServiceContext'
import { MockBlockchainService } from '@/services/blockchain.mock'
// To use real Solana: import { SolanaBlockchainService } from '@/services/blockchain.solana'

import { App } from './App'

/**
 * Swap MockBlockchainService → SolanaBlockchainService to connect real wallets.
 * SolanaBlockchainService constructor will accept a wallet signer and RPC endpoint.
 */
const blockchainService = new MockBlockchainService()

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StrictMode>
    <SelectedWalletAccountProvider>
      <BlockchainServiceContext.Provider value={blockchainService}>
        <App />
      </BlockchainServiceContext.Provider>
    </SelectedWalletAccountProvider>
  </StrictMode>,
)
