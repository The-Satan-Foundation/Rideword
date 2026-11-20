import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
  rewardAmount: z.number().positive().max(100000000),
  rewardCurrency: z.enum(['USD', 'SOL']),
}).superRefine((quest, context) => {
  if (quest.scope === 'local' && quest.radiusKm === null) {
    context.addIssue({ code: 'custom', path: ['radiusKm'], message: 'Local quests need a radius.' })
  }
  if (quest.rewardCurrency === 'USD' && Math.round(quest.rewardAmount * 100) !== quest.rewardAmount * 100) {
    context.addIssue({ code: 'custom', path: ['rewardAmount'], message: 'USD amounts support up to two decimal places.' })
  }
})

const publicFields = 'id, created_at, title, description, location_label, latitude, longitude, scope, radius_km, credential_minimum, reward_amount, reward_currency, status'
const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  try {
    const supabase = await createClient()
    const [{ data: userResult }, { data: quests, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('aegis_quests')
        .select(publicFields)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (error) {
      return NextResponse.json({ error: 'Quest feed is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
    }

    return NextResponse.json(
      {
        quests: quests ?? [],
        user: userResult.user ? { id: userResult.user.id, email: userResult.user.email ?? null } : null,
      },
      { headers: noStoreHeaders },
    )
  } catch {
    return NextResponse.json({ error: 'Quest feed is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders })
  }
}

export async function POST(request: Request) {
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

  const quest = parsed.data
  const { data, error } = await supabase
    .from('aegis_quests')
    .insert({
      author_id: user.id,
      title: quest.title,
      description: quest.description,
      location_label: quest.locationLabel,
      latitude: quest.latitude,
      longitude: quest.longitude,
      scope: quest.scope,
      radius_km: quest.scope === 'local' ? quest.radiusKm : null,
      credential_minimum: quest.credentialMinimum,
      reward_amount: quest.rewardAmount,
      reward_currency: quest.rewardCurrency,
    })
    .select(publicFields)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Could not publish this quest. Please try again.' }, { status: 400, headers: noStoreHeaders })
  }

  return NextResponse.json({ quest: data }, { status: 201, headers: noStoreHeaders })
}
