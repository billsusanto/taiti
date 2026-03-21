'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculatePoints, WINNER_POINTS } from '@/lib/scoring'

interface PlayerScore {
  id: string
  name: string
  position: number
  totalPoints: number
  rank: number | null
}

interface RoundScore {
  playerId: string
  cardsLeft: number
  twosLeft: number
  points: number
  multiplier: number
}

interface Round {
  id: string
  number: number
  winnerId: string | null
  createdAt: string
  scores: RoundScore[]
}

interface Game {
  id: string
  name: string
  maxPlayers: number
  createdAt: string
  currentRound: number
  players: PlayerScore[]
  rounds: Round[]
}

export default function GamePlay({ gameId }: { gameId: string }) {
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roundInputs, setRoundInputs] = useState<{ cards: number; twos: number }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchGame()
  }, [gameId])

  const fetchGame = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`)
      if (!res.ok) {
        throw new Error('Game not found')
      }
      const data = await res.json()
      setGame(data)
      // Initialize round inputs for players
      setRoundInputs(data.players.map(() => ({ cards: 0, twos: 0 })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  const submitRound = async () => {
    if (!game) return
    setIsSubmitting(true)

    try {
      // Find winner (player with 0 cards)
      const winnerIndex = roundInputs.findIndex(i => i.cards === 0)
      
      // Calculate points for each player
      const scores: RoundScore[] = game.players.map((player, idx) => {
        const { points: calculatedPoints, multiplier } = calculatePoints(
          roundInputs[idx].cards,
          roundInputs[idx].twos
        )
        
        // Winner gets -10, others get calculated points
        const finalPoints = idx === winnerIndex ? WINNER_POINTS : calculatedPoints
        
        return {
          playerId: player.id,
          cardsLeft: roundInputs[idx].cards,
          twosLeft: roundInputs[idx].twos,
          points: finalPoints,
          multiplier,
        }
      })

      // Submit to API
      const res = await fetch(`/api/games/${game.id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: game.currentRound,
          winnerId: winnerIndex >= 0 ? game.players[winnerIndex].id : null,
          scores,
        }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to submit round')
      }
      
      const data = await res.json()

      // Update local state
      const updatedPlayers = game.players.map((p, idx) => ({
        ...p,
        totalPoints: p.totalPoints + scores[idx].points,
      }))

      setGame({
        ...game,
        players: updatedPlayers,
        rounds: [...game.rounds, { id: data.id, number: game.currentRound, winnerId: winnerIndex >= 0 ? game.players[winnerIndex].id : null, createdAt: new Date().toISOString(), scores }],
        currentRound: game.currentRound + 1,
      })

      // Reset inputs
      setRoundInputs(game.players.map(() => ({ cards: 0, twos: 0 })))
    } catch (err) {
      console.error('Failed to submit round:', err)
      alert('Failed to submit round. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sort players by points (lowest first = winner)
  const sortedPlayers = game
    ? [...game.players].sort((a, b) => a.totalPoints - b.totalPoints)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading game...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <Link href="/games" className="text-blue-400 hover:text-blue-300">
            ← Back to Games
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/games" className="text-blue-400 hover:text-blue-300 text-sm">
              ← Past Games
            </Link>
            <h1 className="text-4xl font-bold mt-2">{game.name}</h1>
            <p className="text-zinc-400">Round {game.currentRound}</p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            New Game
          </Link>
        </div>

        <div className="space-y-6">
          {/* Scoreboard */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">Scoreboard</h3>
            <div className="space-y-2">
              {sortedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    idx === 0 ? 'bg-green-900/50 border border-green-600' : 'bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-zinc-500">#{idx + 1}</span>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <span className={`text-xl font-mono font-bold ${
                    player.totalPoints <= 0 ? 'text-green-400' : 'text-zinc-300'
                  }`}>
                    {player.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Round Input */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">
              Round {game.currentRound} - Enter Cards
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Enter cards left for each player. The player with 0 cards wins the round (-10 pts).
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {game.players.map((player, idx) => (
                <div key={player.id} className="space-y-3">
                  <div className="text-center font-semibold">{player.name}</div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cards Left (X)</label>
                    <input
                      type="number"
                      min="0"
                      max="13"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={roundInputs[idx]?.cards ?? 0}
                      onChange={(e) => {
                        const newInputs = [...roundInputs]
                        newInputs[idx] = { ...newInputs[idx], cards: parseInt(e.target.value) || 0 }
                        setRoundInputs(newInputs)
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-zinc-700 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">&quot;2&quot; Cards (N)</label>
                    <input
                      type="number"
                      min="0"
                      max="13"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={roundInputs[idx]?.twos ?? 0}
                      onChange={(e) => {
                        const newInputs = [...roundInputs]
                        newInputs[idx] = { ...newInputs[idx], twos: parseInt(e.target.value) || 0 }
                        setRoundInputs(newInputs)
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-zinc-700 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  {roundInputs[idx]?.cards > 0 && (
                    <div className="text-xs text-center text-zinc-400">
                      = {calculatePoints(roundInputs[idx].cards, roundInputs[idx].twos).points} pts
                      <br />
                      (×{calculatePoints(roundInputs[idx].cards, roundInputs[idx].twos).multiplier})
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={submitRound}
              disabled={isSubmitting}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
            >
              {isSubmitting ? 'Submitting...' : `Submit Round ${game.currentRound}`}
            </button>
          </div>

          {/* Round History */}
          {game.rounds.length > 0 && (
            <div className="bg-zinc-800 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4">Round History</h3>
              <div className="space-y-3">
                {[...game.rounds].reverse().map((round) => (
                  <div key={round.id} className="bg-zinc-700 rounded-lg p-3">
                    <div className="text-sm text-zinc-400 mb-2">Round {round.number}</div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      {round.scores.map((score) => {
                        const player = game.players.find(p => p.id === score.playerId)
                        return (
                          <div key={score.playerId} className="text-center">
                            <div className="text-zinc-400">{player?.name}</div>
                            <div className={`font-mono font-bold ${
                              score.points === WINNER_POINTS ? 'text-green-400' : 'text-zinc-200'
                            }`}>
                              {score.points === WINNER_POINTS ? 'WIN' : score.points}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scoring Formula Reference */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>Formula: (X - N + N×5) × multiplier</p>
          <p>Multipliers: 13 cards = 4× | 9-12 = 3× | 5-8 = 2× | 1-4 = 1×</p>
        </div>
      </div>
    </div>
  )
}
