import type { Metadata } from 'next'
import { QuestBoard } from '@/components/dashboard/quest-board'

export const metadata: Metadata = {
  title: 'Quests & Bounties | Grimoir',
  description: 'Browse and publish local or global field quests on the Aegis network, with map pins, credential minimums, and bounty offers.',
}

export default function QuestsPage() {
  return <QuestBoard />
}
