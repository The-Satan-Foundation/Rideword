import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/stripe/server'

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }
const questFields = 'id, created_at, title, description, location_label, latitude, longitude, scope, radius_km, credential_minimum, reward_amount, reward_currency, status, author_id'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to view your quest activity.' }, { status: 401, headers: noStoreHeaders })

    const admin = createAdminClient()
    const [{ data: authored, error: authoredError }, { data: myClaims, error: claimsError }] = await Promise.all([
      admin.from('aegis_quests').select(questFields).eq('author_id', user.id).order('created_at', { ascending: false }).limit(100),
      admin.from('aegis_quest_claims').select('id, quest_id, claimant_id, status, completion_note, created_at, updated_at').eq('claimant_id', user.id).order('created_at', { ascending: false }).limit(100),
    ])

    if (authoredError || claimsError) throw new Error('Could not load quest activity.')

    const authoredIds = (authored ?? []).map((quest) => quest.id)
    const claimQuestIds = [...new Set((myClaims ?? []).map((claim) => claim.quest_id))]
    const allQuestIds = [...new Set([...authoredIds, ...claimQuestIds])]

    const [{ data: fundingRows, error: fundingError }, { data: allQuests, error: questsError }] = await Promise.all([
      allQuestIds.length
        ? admin.from('aegis_quest_funding').select('quest_id, status').in('quest_id', allQuestIds)
        : Promise.resolve({ data: [], error: null }),
      claimQuestIds.length
        ? admin.from('aegis_quests').select(questFields).in('id', claimQuestIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (fundingError || questsError) throw new Error('Could not load quest activity.')

    const authoredClaims = authoredIds.length
      ? await admin
          .from('aegis_quest_claims')
          .select('id, quest_id, claimant_id, status, completion_note, created_at, updated_at')
          .in('quest_id', authoredIds)
          .in('status', ['claimed', 'submitted', 'payout_pending', 'paid'])
      : { data: [], error: null }

    if (authoredClaims.error) throw new Error('Could not load quest activity.')

    const fundingByQuest = new Map((fundingRows ?? []).map((funding) => [funding.quest_id, funding.status]))
    const questById = new Map((allQuests ?? []).map((quest) => {
      const { author_id: _authorId, ...safeQuest } = quest
      return [quest.id, safeQuest]
    }))
    const latestClaimByQuest = new Map<string, NonNullable<typeof authoredClaims.data>[number]>()
    for (const claim of authoredClaims.data ?? []) {
      const current = latestClaimByQuest.get(claim.quest_id)
      if (!current || new Date(claim.created_at).getTime() > new Date(current.created_at).getTime()) {
        latestClaimByQuest.set(claim.quest_id, claim)
      }
    }

    return NextResponse.json({
      authored: (authored ?? []).map(({ author_id: _authorId, ...quest }) => ({
        ...quest,
        funding_status: fundingByQuest.get(quest.id) ?? null,
        claim: latestClaimByQuest.get(quest.id) ?? null,
      })),
      claims: (myClaims ?? []).map((claim) => ({ ...claim, quest: questById.get(claim.quest_id) ?? null })),
    }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not load quest activity.' }, { status: 503, headers: noStoreHeaders })
  }
}
