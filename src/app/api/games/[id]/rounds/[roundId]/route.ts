import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: gameId, roundId } = await params
    const body = await request.json()
    const { roundNumber, winnerId, scores } = body

    // Update the round
    const round = await prisma.round.update({
      where: { id: roundId },
      data: {
        number: roundNumber,
        winnerId,
      },
    })

    // Delete old scores
    await prisma.score.deleteMany({
      where: { roundId },
    })

    // Create new scores
    await prisma.score.createMany({
      data: scores.map((score: { playerId: string; cardsLeft: number; twosLeft: number; points: number; multiplier: number }) => ({
        roundId,
        playerId: score.playerId,
        cardsLeft: score.cardsLeft,
        twosLeft: score.twosLeft,
        calculatedPoints: score.points,
        multiplier: score.multiplier,
      })),
    })

    // Recalculate all player scores for this game
    const allRounds = await prisma.round.findMany({
      where: { gameId },
      include: { scores: true },
      orderBy: { number: 'asc' },
    })

    // Calculate totals
    const playerTotals = new Map<string, number>()
    allRounds.forEach(r => {
      r.scores.forEach(s => {
        const current = playerTotals.get(s.playerId) || 0
        playerTotals.set(s.playerId, current + s.calculatedPoints)
      })
    })

    // Update playerScores
    const players = await prisma.player.findMany({
      where: { gameId },
    })

    await Promise.all(
      players.map(async (player) => {
        const totalPoints = playerTotals.get(player.id) || 0
        await prisma.playerScore.update({
          where: {
            gameId_playerId: {
              gameId,
              playerId: player.id,
            },
          },
          data: { totalPoints },
        })
      })
    )

    // Update rankings
    const updatedScores = await prisma.playerScore.findMany({
      where: { gameId },
      orderBy: { totalPoints: 'asc' },
    })

    await Promise.all(
      updatedScores.map((ps, idx) =>
        prisma.playerScore.update({
          where: { id: ps.id },
          data: { rank: idx + 1 },
        })
      )
    )

    // Return updated round
    const updatedRound = await prisma.round.findUnique({
      where: { id: roundId },
      include: { scores: true },
    })

    return NextResponse.json(updatedRound)
  } catch (error) {
    console.error('Failed to update round:', error)
    return NextResponse.json({ error: 'Failed to update round' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: gameId, roundId } = await params

    // Delete the round (scores will cascade)
    await prisma.round.delete({
      where: { id: roundId },
    })

    // Renumber remaining rounds
    const remainingRounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: { number: 'asc' },
    })

    await Promise.all(
      remainingRounds.map((r, idx) =>
        prisma.round.update({
          where: { id: r.id },
          data: { number: idx + 1 },
        })
      )
    )

    // Recalculate all player scores
    const allRounds = await prisma.round.findMany({
      where: { gameId },
      include: { scores: true },
      orderBy: { number: 'asc' },
    })

    const playerTotals = new Map<string, number>()
    allRounds.forEach(r => {
      r.scores.forEach(s => {
        const current = playerTotals.get(s.playerId) || 0
        playerTotals.set(s.playerId, current + s.calculatedPoints)
      })
    })

    const players = await prisma.player.findMany({
      where: { gameId },
    })

    await Promise.all(
      players.map(async (player) => {
        const totalPoints = playerTotals.get(player.id) || 0
        await prisma.playerScore.update({
          where: {
            gameId_playerId: {
              gameId,
              playerId: player.id,
            },
          },
          data: { totalPoints },
        })
      })
    )

    // Update rankings
    const updatedScores = await prisma.playerScore.findMany({
      where: { gameId },
      orderBy: { totalPoints: 'asc' },
    })

    await Promise.all(
      updatedScores.map((ps, idx) =>
        prisma.playerScore.update({
          where: { id: ps.id },
          data: { rank: idx + 1 },
        })
      )
    )

    return NextResponse.json({ success: true, roundsDeleted: 1 })
  } catch (error) {
    console.error('Failed to delete round:', error)
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 })
  }
}
