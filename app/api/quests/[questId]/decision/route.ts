import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getStripe, isSameOriginRequest } from '@/lib/stripe/server'

const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) })
const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request, context: { params: Promise<{ questId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const { questId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to review this work.' }, { status: 401, headers: noStoreHeaders })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400, headers: noStoreHeaders })
    }
    const parsed = decisionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Choose an available review action.' }, { status: 400, headers: noStoreHeaders })

    const admin = createAdminClient()
    const { data: quest, error: questError } = await admin
      .from('aegis_quests')
      .select('id, author_id, status')
      .eq('id', questId)
      .maybeSingle()
    if (questError || !quest) return NextResponse.json({ error: 'Quest was not found.' }, { status: 404, headers: noStoreHeaders })
    if (quest.author_id !== user.id) return NextResponse.json({ error: 'Only the quest author can review this work.' }, { status: 403, headers: noStoreHeaders })

    const { data: claim, error: claimError } = await admin
      .from('aegis_quest_claims')
      .select('id, claimant_id, status')
      .eq('quest_id', questId)
      .in('status', ['submitted', 'payout_pending'])
      .maybeSingle()
    if (claimError || !claim) return NextResponse.json({ error: 'There is no submitted work to review.' }, { status: 409, headers: noStoreHeaders })

    if (parsed.data.decision === 'reject') {
      if (claim.status !== 'submitted') {
        return NextResponse.json({ error: 'A payout already started, so this submission cannot be reopened.' }, { status: 409, headers: noStoreHeaders })
      }
      const { error } = await admin.rpc('reject_aegis_quest_claim', { p_quest_id: questId, p_claim_id: claim.id })
      if (error) return NextResponse.json({ error: 'Could not reopen this quest.' }, { status: 409, headers: noStoreHeaders })
      return NextResponse.json({ rejected: true }, { headers: noStoreHeaders })
    }

    const { data: funding, error: fundingError } = await admin
      .from('aegis_quest_funding')
      .select('amount_cents, charge_id, transfer_group, status')
      .eq('quest_id', questId)
      .maybeSingle()
    if (fundingError || !funding || funding.status !== 'funded' || !funding.charge_id) {
      return NextResponse.json({ error: 'Quest funding is not ready for payout.' }, { status: 409, headers: noStoreHeaders })
    }

    const { data: connectedAccount, error: connectedAccountError } = await admin
      .from('aegis_stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', claim.claimant_id)
      .maybeSingle()
    if (connectedAccountError || !connectedAccount) {
      return NextResponse.json({ error: 'The claimant has not connected a Stripe payout account.' }, { status: 409, headers: noStoreHeaders })
    }

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(connectedAccount.stripe_account_id)
    if (account.deleted || !account.payouts_enabled || account.capabilities?.transfers !== 'active') {
      return NextResponse.json({ error: 'The claimant must finish Stripe payout setup before approval.' }, { status: 409, headers: noStoreHeaders })
    }

    const { error: reserveError } = await admin.rpc('reserve_aegis_quest_payout', {
      p_quest_id: questId,
      p_claim_id: claim.id,
    })
    if (reserveError) return NextResponse.json({ error: 'This submission is not ready for payout.' }, { status: 409, headers: noStoreHeaders })

    const transfer = await stripe.transfers.create(
      {
        amount: Number(funding.amount_cents),
        currency: 'usd',
        destination: connectedAccount.stripe_account_id,
        source_transaction: funding.charge_id,
        transfer_group: funding.transfer_group,
        metadata: { quest_id: questId, claim_id: claim.id },
      },
      { idempotencyKey: `aegis-quest-payout-${claim.id}` },
    )

    const { error: finalizeError } = await admin.rpc('finalize_aegis_quest_payout', {
      p_quest_id: questId,
      p_claim_id: claim.id,
      p_transfer_id: transfer.id,
    })
    if (finalizeError) {
      return NextResponse.json({ error: 'Payout was initiated and is being reconciled. Retry approval to complete the status update.' }, { status: 503, headers: noStoreHeaders })
    }

    return NextResponse.json({ paid: true }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Could not complete the payout. The approval can be safely retried.' }, { status: 503, headers: noStoreHeaders })
  }
}
