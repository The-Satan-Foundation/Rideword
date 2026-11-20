import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getStripe, isSameOriginRequest, requestOrigin } from '@/lib/stripe/server'

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to connect Stripe payouts.' }, { status: 401, headers: noStoreHeaders })

    const admin = createAdminClient()
    const stripe = getStripe()
    const { data: savedAccount, error: lookupError } = await admin
      .from('aegis_stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (lookupError) throw lookupError

    let accountId = savedAccount?.stripe_account_id
    let account = accountId ? await stripe.accounts.retrieve(accountId) : null

    if (!account || account.deleted) {
      account = await stripe.accounts.create(
        {
          controller: {
            stripe_dashboard: { type: 'express' },
            requirement_collection: 'stripe',
          },
          capabilities: { transfers: { requested: true } },
          ...(user.email ? { email: user.email } : {}),
          metadata: { aegis_user_id: user.id },
        },
        { idempotencyKey: `aegis-connect-${user.id}` },
      )
      accountId = account.id
      const { error: saveError } = await admin
        .from('aegis_stripe_accounts')
        .upsert({ user_id: user.id, stripe_account_id: account.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (saveError) throw saveError
    } else {
      accountId = account.id
    }

    if (account.payouts_enabled && account.capabilities?.transfers === 'active') {
      return NextResponse.json({ payoutsEnabled: true }, { headers: noStoreHeaders })
    }

    const origin = requestOrigin(request)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/quests?connect=refresh`,
      return_url: `${origin}/dashboard/quests?connect=return`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, payoutsEnabled: false }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not start Stripe onboarding. Please try again.' }, { status: 503, headers: noStoreHeaders })
  }
}
