import 'server-only'

import { createAdminClient, getStripe } from '@/lib/stripe/server'

interface CreateQuestCheckoutInput {
  questId: string
  authorId: string
  title: string
  amountCents: number
  origin: string
}

export async function createQuestCheckoutSession({
  questId,
  authorId,
  title,
  amountCents,
  origin,
}: CreateQuestCheckoutInput) {
  const admin = createAdminClient()
  const { data: funding, error } = await admin
    .from('aegis_quest_funding')
    .select('status, checkout_session_id, amount_cents, transfer_group')
    .eq('quest_id', questId)
    .maybeSingle()

  if (error || !funding || funding.status !== 'checkout_pending') {
    throw new Error('Quest funding is not available.')
  }

  if (Number(funding.amount_cents) !== amountCents) {
    throw new Error('Quest funding amount does not match.')
  }

  const stripe = getStripe()
  let idempotencyKey = `aegis-checkout-${questId}-initial`

  if (funding.checkout_session_id) {
    const previousSession = await stripe.checkout.sessions.retrieve(funding.checkout_session_id)
    if (previousSession.status === 'open' && previousSession.url) {
      return { checkoutUrl: previousSession.url, alreadyPaid: false }
    }
    if (previousSession.payment_status === 'paid') {
      return { checkoutUrl: null, alreadyPaid: true, awaitingPayment: false }
    }
    if (previousSession.status === 'complete') {
      return { checkoutUrl: null, alreadyPaid: false, awaitingPayment: true }
    }
    idempotencyKey = `aegis-checkout-${questId}-${funding.checkout_session_id}`
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      client_reference_id: questId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Aegis quest bounty: ${title.slice(0, 150)}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { quest_id: questId, author_id: authorId },
      payment_intent_data: {
        transfer_group: funding.transfer_group,
        metadata: { quest_id: questId, author_id: authorId },
      },
      success_url: `${origin}/dashboard/quests?funding=success&quest_id=${questId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/quests?funding=cancelled&quest_id=${questId}`,
    },
    { idempotencyKey },
  )

  if (!session.url) throw new Error('Stripe did not return a Checkout URL.')

  const { error: updateError } = await admin
    .from('aegis_quest_funding')
    .update({ checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq('quest_id', questId)
    .eq('status', 'checkout_pending')

  if (updateError) throw new Error('Could not save the Checkout session.')

  return { checkoutUrl: session.url, alreadyPaid: false, awaitingPayment: false }
}
