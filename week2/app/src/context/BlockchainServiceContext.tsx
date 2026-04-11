import { createContext, useContext } from 'react'
import type { BlockchainService } from '@/services/blockchain.interface'

export const BlockchainServiceContext = createContext<BlockchainService | null>(null)

export function useBlockchainService(): BlockchainService {
  const service = useContext(BlockchainServiceContext)
  if (!service) {
    throw new Error('useBlockchainService must be used within BlockchainServiceContext.Provider')
  }
  return service
}
