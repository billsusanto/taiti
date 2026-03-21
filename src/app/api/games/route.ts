import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, playerNames } = body

    // Create a default user (we'll add auth later)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'player@taiti.local',
          name: 'Player',
        },
      })
    }

    // Create game with players
    const game = await prisma.game.create({
      data: {
        name,
        maxPlayers: playerNames.length,
        ownerId: user.id,
        players: {
          create: playerNames.map((playerName: string, idx: number) => ({
            name: playerName,
            position: idx + 1,
          })),
        },
      },
      include: {
        players: true,
      },
    })

    // Create playerScores for each player
    await prisma.playerScore.createMany({
      data: game.players.map((player) => ({
        gameId: game.id,
        playerId: player.id,
        totalPoints: 0,
      })),
    })

    return NextResponse.json({
      id: game.id,
      name: game.name,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        totalPoints: 0,
      })),
    })
  } catch (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json({ 
      error: 'Failed to create game',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const games = await prisma.game.findMany({
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
          orderBy: { number: 'desc' },
        },
        playerScores: {
          orderBy: { rank: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate currentRound and totalPoints for each game
    const gamesWithScores = games.map(game => {
      // Calculate totalPoints from rounds
      const playerScoresMap = new Map<string, number>()
      game.players.forEach(p => playerScoresMap.set(p.id, 0))
      
      game.rounds.forEach(round => {
        round.scores.forEach(score => {
          const current = playerScoresMap.get(score.playerId) || 0
          playerScoresMap.set(score.playerId, current + score.calculatedPoints)
        })
      })

      return {
        ...game,
        currentRound: game.rounds.length + 1,
        players: game.players.map(p => ({
          ...p,
          totalPoints: playerScoresMap.get(p.id) || 0,
          rank: game.playerScores.find(ps => ps.playerId === p.id)?.rank || null,
        })),
      }
    })

    return NextResponse.json(gamesWithScores)
  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}
