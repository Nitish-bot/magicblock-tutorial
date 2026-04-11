import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ArrowRight, HandFist, Hand, Scissors } from '@phosphor-icons/react'
import { useBlockchainService } from '@/context/BlockchainServiceContext'

const EASE = 'easeInOut' as const

export function HomePage() {
  const navigate = useNavigate()
  const service = useBlockchainService()

  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinId, setJoinId] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)
    try {
      const gameId = await service.createGame()
      navigate(`/game/${gameId}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create game')
      setIsCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinId.trim()) return
    setIsJoining(true)
    setJoinError(null)
    try {
      await service.joinGame(joinId.trim().toUpperCase())
      navigate(`/game/${joinId.trim().toUpperCase()}`)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join game')
      setIsJoining(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 px-4 py-16 gap-14"
    >
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-6">
        {/* Floating choice icons */}
        <div className="flex items-end gap-6 mb-2">
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: EASE }}
          >
            <HandFist size={40} weight="fill" style={{ color: 'oklch(58% 0.27 292)' }} />
          </motion.div>
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: EASE, delay: 0.5 }}
          >
            <Hand size={48} weight="fill" style={{ color: 'oklch(82% 0.17 200)' }} />
          </motion.div>
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: EASE, delay: 1 }}
          >
            <Scissors size={40} weight="fill" style={{ color: 'oklch(83% 0.27 140)' }} />
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="font-display font-bold text-4xl md:text-6xl tracking-widest uppercase leading-tight"
        >
          <span style={{ color: 'oklch(58% 0.27 292)' }}>Rock </span>
          <span style={{ color: 'oklch(82% 0.17 200)' }}>Paper </span>
          <span style={{ color: 'oklch(83% 0.27 140)' }}>Scissors</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="text-muted font-display tracking-widest text-sm uppercase"
        >
          Onchain · Provably Fair · Lightning Fast
        </motion.p>
      </div>

      {/* Action cards */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 280, damping: 28 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl"
      >
        {/* Create Game */}
        <div className="card glass-surface border border-base-content/7 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg tracking-wider text-base-content">
              Create Game
            </h2>
            <p className="text-muted text-sm mt-1">
              Start a new match and invite an opponent.
            </p>
          </div>

          {createError && (
            <div role="alert" className="alert alert-error alert-soft text-xs py-2">
              {createError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn btn-primary font-display tracking-widest uppercase text-xs gap-2 mt-auto"
          >
            {isCreating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Plus size={14} weight="bold" />
            )}
            {isCreating ? 'Creating…' : 'Create Game'}
          </button>
        </div>

        {/* Join Game */}
        <div className="card glass-surface border border-base-content/7 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg tracking-wider text-base-content">
              Join Game
            </h2>
            <p className="text-muted text-sm mt-1">
              Enter a game ID to join an existing match.
            </p>
          </div>

          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Enter Game ID"
            maxLength={16}
            className="input input-bordered w-full font-display tracking-widest uppercase text-sm placeholder:normal-case placeholder:tracking-normal"
          />

          {joinError && (
            <div role="alert" className="alert alert-error alert-soft text-xs py-2">
              {joinError}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isJoining || !joinId.trim()}
            className="btn btn-secondary btn-outline font-display tracking-widest uppercase text-xs gap-2 mt-auto"
          >
            {isJoining ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <ArrowRight size={14} weight="bold" />
            )}
            {isJoining ? 'Joining…' : 'Join Game'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
