import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params
    const body = await request.json()
    const { roundNumber, winnerId, scores } = body

    // Create round
    const round = await prisma.round.create({
      data: {
        number: roundNumber,
        gameId,
        winnerId,
        scores: {
          create: scores.map((score: { playerId: string; cardsLeft: number; twosLeft: number; points: number; multiplier: number }) => ({
            playerId: score.playerId,
            cardsLeft: score.cardsLeft,
            twosLeft: score.twosLeft,
            calculatedPoints: score.points,
            multiplier: score.multiplier,
          })),
        },
      },
      include: {
        scores: true,
      },
    })

    // Update player scores
    await Promise.all(
      scores.map((score: { playerId: string; points: number }) =>
        prisma.playerScore.update({
          where: {
            gameId_playerId: {
              gameId,
              playerId: score.playerId,
            },
          },
          data: {
            totalPoints: {
              increment: score.points,
            },
          },
        })
      )
    )

    // Update rankings
    const playerScores = await prisma.playerScore.findMany({
      where: { gameId },
      orderBy: { totalPoints: 'asc' },
    })

    await Promise.all(
      playerScores.map((ps, idx) =>
        prisma.playerScore.update({
          where: { id: ps.id },
          data: { rank: idx + 1 },
        })
      )
    )

    return NextResponse.json(round)
  } catch (error) {
    console.error('Failed to create round:', error)
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 })
  }
}
