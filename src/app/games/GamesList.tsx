'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { WINNER_POINTS } from '@/lib/scoring'

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

export default function GamesList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGame, setExpandedGame] = useState<string | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games')
      const data = await res.json()
      setGames(data)
    } catch (err) {
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const fetchGameDetails = async (gameId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}`)
      const data = await res.json()
      setGames(prev => prev.map(g => g.id === gameId ? data : g))
    } catch (err) {
      console.error('Failed to fetch game details:', err)
    }
  }

  const toggleGame = async (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null)
    } else {
      setExpandedGame(gameId)
      // Check if we already have full details
      const game = games.find(g => g.id === gameId)
      if (game && (!game.rounds || game.rounds.length === 0)) {
        await fetchGameDetails(gameId)
      }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading games...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎴 Past Games</h1>
            <p className="text-zinc-400">Continue or review your games</p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            New Game
          </Link>
        </div>

        {/* Games List */}
        {games.length === 0 ? (
          <div className="bg-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400 mb-4">No games yet</p>
            <Link
              href="/"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Create your first game
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <div key={game.id} className="bg-zinc-800 rounded-xl overflow-hidden">
                {/* Game Header */}
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-700/50 transition-colors"
                  onClick={() => toggleGame(game.id)}
                >
                  <div>
                    <h2 className="text-xl font-semibold">{game.name}</h2>
                    <p className="text-sm text-zinc-400">
                      {formatDate(game.createdAt)} • Round {game.currentRound - 1} completed
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Players</div>
                      <div className="font-medium">{game.players?.length || game.maxPlayers}</div>
                    </div>
                    <svg
                      className={`w-6 h-6 text-zinc-400 transition-transform ${
                        expandedGame === game.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedGame === game.id && (
                  <div className="border-t border-zinc-700 p-4 space-y-6">
                    {/* Players & Scores */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Current Standings</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {game.players?.sort((a, b) => (a.rank || 999) - (b.rank || 999)).map((player, idx) => (
                          <div
                            key={player.id}
                            className={`p-3 rounded-lg ${
                              idx === 0 ? 'bg-green-900/50 border border-green-600' : 'bg-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold text-zinc-500">#{idx + 1}</span>
                              <span className="font-medium truncate">{player.name}</span>
                            </div>
                            <div className={`text-2xl font-mono font-bold ${
                              player.totalPoints <= 0 ? 'text-green-400' : 'text-zinc-200'
                            }`}>
                              {player.totalPoints}
                            </div>
                            <div className="text-xs text-zinc-400">points</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Round History */}
                    {game.rounds && game.rounds.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Round History</h3>
                        <div className="space-y-2">
                          {[...game.rounds].reverse().slice(0, 5).map((round) => (
                            <div key={round.id} className="bg-zinc-700 rounded-lg p-3">
                              <div className="text-sm text-zinc-400 mb-2">
                                Round {round.number} • {formatDate(round.createdAt)}
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                {round.scores.map((score) => {
                                  const player = game.players?.find(p => p.id === score.playerId)
                                  return (
                                    <div key={score.playerId} className="text-center">
                                      <div className="text-zinc-400 truncate">{player?.name || 'Unknown'}</div>
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

                    {/* Continue Button */}
                    <Link
                      href={`/games/${game.id}`}
                      className="block w-full bg-blue-600 hover:bg-blue-500 text-center py-3 rounded-lg font-semibold transition-colors"
                    >
                      Continue Game
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
