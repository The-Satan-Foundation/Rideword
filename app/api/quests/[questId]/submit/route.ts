import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isSameOriginRequest } from '@/lib/stripe/server'

const completionSchema = z.object({ note: z.string().trim().min(10).max(2000) })
const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request, context: { params: Promise<{ questId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const { questId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to submit your work.' }, { status: 401, headers: noStoreHeaders })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400, headers: noStoreHeaders })
    }

    const parsed = completionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Add a completion note.' }, { status: 400, headers: noStoreHeaders })
    }

    const admin = createAdminClient()
    const { data: claim, error } = await admin
      .from('aegis_quest_claims')
      .update({ status: 'submitted', completion_note: parsed.data.note, updated_at: new Date().toISOString() })
      .eq('quest_id', questId)
      .eq('claimant_id', user.id)
      .eq('status', 'claimed')
      .select('id')
      .maybeSingle()

    if (error || !claim) return NextResponse.json({ error: 'This claim is not awaiting a completion report.' }, { status: 409, headers: noStoreHeaders })
    return NextResponse.json({ submitted: true }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not submit the completion report.' }, { status: 503, headers: noStoreHeaders })
  }
}
