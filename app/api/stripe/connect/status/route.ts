import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getStripe } from '@/lib/stripe/server'

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to check payout setup.' }, { status: 401, headers: noStoreHeaders })

    const admin = createAdminClient()
    const { data: savedAccount, error } = await admin
      .from('aegis_stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error

    if (!savedAccount) {
      return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false }, { headers: noStoreHeaders })
    }

    const account = await getStripe().accounts.retrieve(savedAccount.stripe_account_id)
    if (account.deleted) {
      return NextResponse.json({ connected: false, detailsSubmitted: false, payoutsEnabled: false }, { headers: noStoreHeaders })
    }

    return NextResponse.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled && account.capabilities?.transfers === 'active',
    }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not check Stripe payout status.' }, { status: 503, headers: noStoreHeaders })
  }
}
