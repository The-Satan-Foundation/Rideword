import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient, getStripe } from '@/lib/stripe/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook signing secret is not configured.' }, { status: 503 })
  }
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      const questId = session.metadata?.quest_id
      if (questId) {
        const { error } = await admin
          .from('aegis_quest_funding')
          .update({ checkout_session_id: null, updated_at: new Date().toISOString() })
          .eq('quest_id', questId)
          .eq('checkout_session_id', session.id)
          .eq('status', 'checkout_pending')
        if (error) throw error
      }
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      const questId = session.metadata?.quest_id
      const authorId = session.metadata?.author_id

      if (session.payment_status !== 'paid' || !questId || !authorId) {
        return NextResponse.json({ received: true })
      }

      const { data: funding, error: fundingError } = await admin
        .from('aegis_quest_funding')
        .select('status, amount_cents, checkout_session_id')
        .eq('quest_id', questId)
        .maybeSingle()
      if (fundingError) throw fundingError
      if (!funding || funding.checkout_session_id !== session.id) {
        return NextResponse.json({ received: true })
      }
      if (Number(funding.amount_cents) !== session.amount_total || session.currency !== 'usd') {
        return NextResponse.json({ error: 'Checkout amount does not match the quest.' }, { status: 400 })
      }

      const { data: quest, error: questError } = await admin
        .from('aegis_quests')
        .select('author_id, status')
        .eq('id', questId)
        .maybeSingle()
      if (questError) throw questError
      if (!quest || quest.author_id !== authorId) {
        return NextResponse.json({ error: 'Quest author does not match Checkout metadata.' }, { status: 400 })
      }

      let paymentIntentId: string | null = null
      let chargeId: string | null = null
      if (typeof session.payment_intent === 'string') {
        const paymentIntent = await getStripe().paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] })
        paymentIntentId = paymentIntent.id
        const latestCharge = paymentIntent.latest_charge
        chargeId = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id ?? null
      }
      if (!paymentIntentId || !chargeId) throw new Error('Paid Checkout is missing its source charge.')

      if (funding.status === 'checkout_pending') {
        const { error } = await admin
          .from('aegis_quest_funding')
          .update({ status: 'funded', payment_intent_id: paymentIntentId, charge_id: chargeId, updated_at: new Date().toISOString() })
          .eq('quest_id', questId)
          .eq('checkout_session_id', session.id)
          .eq('status', 'checkout_pending')
        if (error) throw error
      }

      if (quest.status === 'pending_payment') {
        const { error } = await admin
          .from('aegis_quests')
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq('id', questId)
          .eq('status', 'pending_payment')
        if (error) throw error
      }
    }
  } catch {
    return NextResponse.json({ error: 'Stripe event could not be applied.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
