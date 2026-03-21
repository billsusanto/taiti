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

    // Create game
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
        playerScores: {
          create: playerNames.map((_: string, idx: number) => ({
            playerId: '', // Will update after player creation
            totalPoints: 0,
          })),
        },
      },
      include: {
        players: true,
      },
    })

    // Update playerScores with actual playerIds
    await Promise.all(
      game.players.map((player) =>
        prisma.playerScore.update({
          where: {
            gameId_playerId: {
              gameId: game.id,
              playerId: player.id,
            },
          },
          data: { playerId: player.id },
        })
      )
    )

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
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      include: {
        players: true,
        rounds: {
          include: {
            scores: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}
