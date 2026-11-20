import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isSameOriginRequest, requestOrigin } from '@/lib/stripe/server'
import { createQuestCheckoutSession } from '@/lib/stripe/quest-checkout'

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request, context: { params: Promise<{ questId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const { questId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to fund this quest.' }, { status: 401, headers: noStoreHeaders })

    const admin = createAdminClient()
    const { data: quest, error } = await admin
      .from('aegis_quests')
      .select('id, author_id, title, reward_amount, reward_currency, status')
      .eq('id', questId)
      .maybeSingle()

    if (error || !quest) return NextResponse.json({ error: 'Quest was not found.' }, { status: 404, headers: noStoreHeaders })
    if (quest.author_id !== user.id) return NextResponse.json({ error: 'Only the quest author can fund it.' }, { status: 403, headers: noStoreHeaders })
    if (quest.status !== 'pending_payment' || quest.reward_currency !== 'USD') {
      return NextResponse.json({ error: 'This quest is not awaiting USD funding.' }, { status: 409, headers: noStoreHeaders })
    }

    const checkout = await createQuestCheckoutSession({
      questId,
      authorId: user.id,
      title: quest.title,
      amountCents: Math.round(Number(quest.reward_amount) * 100),
      origin: requestOrigin(request),
    })

    return NextResponse.json(checkout, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not start secure checkout. Please try again.' }, { status: 503, headers: noStoreHeaders })
  }
}
