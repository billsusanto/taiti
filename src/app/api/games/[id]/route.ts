import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            playerScores: true,
          },
        },
        rounds: {
          include: {
            scores: true,
          },
          orderBy: { number: 'asc' },
        },
        playerScores: {
          include: {
            player: true,
          },
          orderBy: { rank: 'asc' },
        },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Calculate current scores from all rounds
    const playerScoresMap = new Map<string, number>()
    game.players.forEach(p => playerScoresMap.set(p.id, 0))
    
    game.rounds.forEach(round => {
      round.scores.forEach(score => {
        const current = playerScoresMap.get(score.playerId) || 0
        playerScoresMap.set(score.playerId, current + score.calculatedPoints)
      })
    })

    // Format response with calculated scores
    const response = {
      id: game.id,
      name: game.name,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      currentRound: game.rounds.length + 1,
      players: game.players.map(p => {
        const totalPoints = playerScoresMap.get(p.id) || 0
        const rank = game.playerScores.find(ps => ps.playerId === p.id)?.rank || null
        return {
          id: p.id,
          name: p.name,
          position: p.position,
          totalPoints,
          rank,
        }
      }),
      rounds: game.rounds.map(r => ({
        id: r.id,
        number: r.number,
        winnerId: r.winnerId,
        createdAt: r.createdAt,
        scores: r.scores.map(s => ({
          playerId: s.playerId,
          cardsLeft: s.cardsLeft,
          twosLeft: s.twosLeft,
          points: s.calculatedPoints,
          multiplier: s.multiplier,
        })),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
