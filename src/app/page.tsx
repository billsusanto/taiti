'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculatePoints, WINNER_POINTS, MAX_PLAYERS } from '@/lib/scoring'

interface Player {
  id: string
  name: string
  position: number
  totalPoints: number
}

interface RoundScore {
  playerId: string
  cardsLeft: number
  twosLeft: number
  points: number
  multiplier: number
}

interface GameState {
  id: string
  name: string
  players: Player[]
  rounds: {
    id: string
    number: number
    scores: RoundScore[]
  }[]
  currentRound: number
}

export default function TaitiScoring() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameName, setGameName] = useState('')
  const [playerNames, setPlayerNames] = useState(['', '', '', ''])
  const [roundInputs, setRoundInputs] = useState<{ cards: number; twos: number }[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize round inputs for 4 players
  useEffect(() => {
    if (gameState) {
      setRoundInputs(
        gameState.players.map(() => ({ cards: 0, twos: 0 }))
      )
    }
  }, [gameState])

  const createGame = async () => {
    if (!gameName.trim() || playerNames.some(n => !n.trim())) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gameName, playerNames }),
      })
      const data = await res.json()
      setGameState({
        id: data.id,
        name: data.name,
        players: data.players,
        rounds: [],
        currentRound: 1,
      })
    } catch (error) {
      console.error('Failed to create game:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const submitRound = async () => {
    if (!gameState) return
    setIsSubmitting(true)

    try {
      // Find winner (player with 0 cards)
      const winnerIndex = roundInputs.findIndex(i => i.cards === 0)
      
      // Calculate points for each player
      const scores: RoundScore[] = gameState.players.map((player, idx) => {
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
      const res = await fetch(`/api/games/${gameState.id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: gameState.currentRound,
          winnerId: winnerIndex >= 0 ? gameState.players[winnerIndex].id : null,
          scores,
        }),
      })
      const data = await res.json()

      // Update local state
      const updatedPlayers = gameState.players.map((p, idx) => ({
        ...p,
        totalPoints: p.totalPoints + scores[idx].points,
      }))

      setGameState({
        ...gameState,
        players: updatedPlayers,
        rounds: [...gameState.rounds, { id: data.id, number: gameState.currentRound, scores }],
        currentRound: gameState.currentRound + 1,
      })

      // Reset inputs
      setRoundInputs(gameState.players.map(() => ({ cards: 0, twos: 0 })))
    } catch (error) {
      console.error('Failed to submit round:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetGame = () => {
    setGameState(null)
    setGameName('')
    setPlayerNames(['', '', '', ''])
    setRoundInputs([])
  }

  // Sort players by points (lowest first = winner)
  const sortedPlayers = gameState
    ? [...gameState.players].sort((a, b) => a.totalPoints - b.totalPoints)
    : []

  // If not logged in, show create game form
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🎴 Taiti</h1>
          <p className="text-zinc-400">Game Points Tracker</p>
          <Link
            href="/games"
            className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm"
          >
            View Past Games →
          </Link>
        </div>

        {/* Create Game Form */}
        {!gameState && (
          <div className="bg-zinc-800 rounded-xl p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">New Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Game Name</label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Friday Night Game"
                  className="w-full bg-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {playerNames.map((name, idx) => (
                <div key={idx}>
                  <label className="block text-sm text-zinc-400 mb-1">Player {idx + 1}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...playerNames]
                      newNames[idx] = e.target.value
                      setPlayerNames(newNames)
                    }}
                    placeholder={`Player ${idx + 1}`}
                    className="w-full bg-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <button
                onClick={createGame}
                disabled={isCreating || !gameName.trim() || playerNames.some(n => !n.trim())}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
              >
                {isCreating ? 'Creating...' : 'Start Game'}
              </button>
            </div>
          </div>
        )}

        {/* Game View */}
        {gameState && (
          <div className="space-y-6">
            {/* Game Header */}
            <div className="bg-zinc-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{gameState.name}</h2>
                <p className="text-zinc-400">Round {gameState.currentRound}</p>
              </div>
              <button
                onClick={resetGame}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                New Game
              </button>
            </div>

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
                Round {gameState.currentRound} - Enter Cards
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Enter cards left for each player. The player with 0 cards wins the round (-10 pts).
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player, idx) => (
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
                {isSubmitting ? 'Submitting...' : `Submit Round ${gameState.currentRound}`}
              </button>
            </div>

            {/* Round History */}
            {gameState.rounds.length > 0 && (
              <div className="bg-zinc-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4">Round History</h3>
                <div className="space-y-3">
                  {[...gameState.rounds].reverse().map((round) => (
                    <div key={round.id} className="bg-zinc-700 rounded-lg p-3">
                      <div className="text-sm text-zinc-400 mb-2">Round {round.number}</div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        {round.scores.map((score, idx) => (
                          <div key={score.playerId} className="text-center">
                            <div className="text-zinc-400">{gameState.players[idx].name}</div>
                            <div className={`font-mono font-bold ${
                              score.points === WINNER_POINTS ? 'text-green-400' : 'text-zinc-200'
                            }`}>
                              {score.points === WINNER_POINTS ? 'WIN' : score.points}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoring Formula Reference */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>Formula: (X - N + N×5) × multiplier</p>
          <p>Multipliers: 13 cards = 4× | 9-12 = 3× | 5-8 = 2× | 1-4 = 1×</p>
        </div>
      </div>
    </div>
  )
}
