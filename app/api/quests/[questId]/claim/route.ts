import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getStripe, isSameOriginRequest } from '@/lib/stripe/server'

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request, context: { params: Promise<{ questId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const { questId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to claim a quest.' }, { status: 401, headers: noStoreHeaders })

    const admin = createAdminClient()
    const { data: savedAccount, error: accountError } = await admin
      .from('aegis_stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (accountError) throw accountError
    if (!savedAccount) {
      return NextResponse.json({ error: 'Connect Stripe payouts before claiming funded work.' }, { status: 409, headers: noStoreHeaders })
    }

    const account = await getStripe().accounts.retrieve(savedAccount.stripe_account_id)
    if (account.deleted || !account.payouts_enabled || account.capabilities?.transfers !== 'active') {
      return NextResponse.json({ error: 'Finish Stripe payout setup before claiming funded work.' }, { status: 409, headers: noStoreHeaders })
    }

    const { data: claimId, error } = await supabase.rpc('claim_aegis_quest', { p_quest_id: questId })
    if (error || !claimId) {
      return NextResponse.json({ error: 'This quest is no longer available to claim.' }, { status: 409, headers: noStoreHeaders })
    }

    return NextResponse.json({ claimId }, { status: 201, headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not claim this quest. Please try again.' }, { status: 503, headers: noStoreHeaders })
  }
}
