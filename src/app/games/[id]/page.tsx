import GamePlay from './GamePlay'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContinueGamePage({ params }: PageProps) {
  const { id } = await params
  return <GamePlay gameId={id} />
}
