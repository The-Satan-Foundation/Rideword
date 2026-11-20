import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isSameOriginRequest, requestOrigin } from '@/lib/stripe/server'
import { createQuestCheckoutSession } from '@/lib/stripe/quest-checkout'

const questInputSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(2400),
  locationLabel: z.string().trim().min(2).max(180),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  scope: z.enum(['local', 'global']),
  radiusKm: z.number().int().min(1).max(1000).nullable(),
  credentialMinimum: z.enum([
    'aegis_holder',
    'water_treatment',
    'medical_professional',
    'licensed_engineer',
    'field_technician',
  ]),
  rewardAmount: z.number().min(0.5).max(999999.99),
  rewardCurrency: z.literal('USD'),
}).superRefine((quest, context) => {
  if (quest.scope === 'local' && quest.radiusKm === null) {
    context.addIssue({ code: 'custom', path: ['radiusKm'], message: 'Local quests need a radius.' })
  }
  if (Math.round(quest.rewardAmount * 100) !== quest.rewardAmount * 100) {
    context.addIssue({ code: 'custom', path: ['rewardAmount'], message: 'USD amounts support up to two decimal places.' })
  }
})

const publicFields = 'id, created_at, title, description, location_label, latitude, longitude, scope, radius_km, credential_minimum, reward_amount, reward_currency, status'
const questFields = `${publicFields}, author_id`
const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  try {
    const supabase = await createClient()
    const [{ data: userResult }, { data: quests, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('aegis_quests')
        .select(questFields)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (error) {
      return NextResponse.json({ error: 'Quest feed is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
    }

    const questIds = (quests ?? []).map((quest) => quest.id)
    const admin = createAdminClient()
    const { data: fundingRows, error: fundingError } = questIds.length
      ? await admin
          .from('aegis_quest_funding')
          .select('quest_id, status')
          .in('quest_id', questIds)
      : { data: [], error: null }

    if (fundingError) {
      return NextResponse.json({ error: 'Quest feed is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
    }

    const fundingByQuest = new Map((fundingRows ?? []).map((funding) => [funding.quest_id, funding.status]))
    const publicQuests = (quests ?? []).map(({ author_id, ...quest }) => ({
      ...quest,
      is_author: userResult.user?.id === author_id,
      funding_status: fundingByQuest.get(quest.id) ?? null,
    }))

    return NextResponse.json(
      {
        quests: publicQuests,
        user: userResult.user ? { id: userResult.user.id, email: userResult.user.email ?? null } : null,
      },
      { headers: noStoreHeaders },
    )
  } catch {
    return NextResponse.json({ error: 'Quest feed is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in to publish a quest.' }, { status: 401, headers: noStoreHeaders })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400, headers: noStoreHeaders })
    }

    const parsed = questInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Quest details are invalid.' },
        { status: 400, headers: noStoreHeaders },
      )
    }

    const questInput = parsed.data
    const amountCents = Math.round(questInput.rewardAmount * 100)
    const { data: quest, error: questError } = await supabase
      .from('aegis_quests')
      .insert({
        author_id: user.id,
        title: questInput.title,
        description: questInput.description,
        location_label: questInput.locationLabel,
        latitude: questInput.latitude,
        longitude: questInput.longitude,
        scope: questInput.scope,
        radius_km: questInput.scope === 'local' ? questInput.radiusKm : null,
        credential_minimum: questInput.credentialMinimum,
        reward_amount: amountCents / 100,
        reward_currency: 'USD',
      })
      .select(publicFields)
      .single()

    if (questError || !quest) {
      return NextResponse.json({ error: 'Could not create this quest. Please try again.' }, { status: 400, headers: noStoreHeaders })
    }

    const admin = createAdminClient()
    const { error: fundingError } = await admin.from('aegis_quest_funding').insert({
      quest_id: quest.id,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'checkout_pending',
      transfer_group: `aegis_quest_${quest.id}`,
    })

    if (fundingError) {
      await admin.from('aegis_quests').update({ status: 'cancelled' }).eq('id', quest.id)
      return NextResponse.json({ error: 'Could not initialize secure funding for this quest.' }, { status: 503, headers: noStoreHeaders })
    }

    const checkout = await createQuestCheckoutSession({
      questId: quest.id,
      authorId: user.id,
      title: quest.title,
      amountCents,
      origin: requestOrigin(request),
    })

    return NextResponse.json({ quest, ...checkout }, { status: 201, headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not start secure checkout. Your quest remains pending and can be funded from My work.' }, { status: 503, headers: noStoreHeaders })
  }
}
