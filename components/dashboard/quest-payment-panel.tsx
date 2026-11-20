'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowUpRight, Check, CircleDollarSign, LoaderCircle, RotateCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { Quest } from '@/lib/quests'

interface WorkClaim {
  id: string
  quest_id: string
  claimant_id: string
  status: 'claimed' | 'submitted' | 'payout_pending' | 'rejected' | 'paid'
  completion_note: string | null
  created_at: string
  updated_at: string
}

interface AuthoredQuest extends Quest {
  funding_status: 'checkout_pending' | 'funded' | 'paid' | null
  claim: WorkClaim | null
}

interface MyClaim extends WorkClaim {
  quest: Quest | null
}

interface WorkResponse {
  authored: AuthoredQuest[]
  claims: MyClaim[]
}

interface ConnectStatus {
  connected: boolean
  detailsSubmitted: boolean
  payoutsEnabled: boolean
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Could not load payment status.')
  return body
}

async function postJson<T>(url: string, payload?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Request could not be completed.')
  return body
}

export function QuestPaymentPanel({ userId }: { userId: string }) {
  const { data: work, error: workError, isLoading, mutate: mutateWork } = useSWR<WorkResponse>(userId ? '/api/quests/mine' : null, fetchJson)
  const { data: connect, error: connectError, mutate: mutateConnect } = useSWR<ConnectStatus>(userId ? '/api/stripe/connect/status' : null, fetchJson)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function connectPayouts() {
    setBusyKey('connect')
    setActionError(null)
    try {
      const result = await postJson<{ url?: string; payoutsEnabled: boolean }>('/api/stripe/connect/onboarding')
      if (result.url) {
        window.location.assign(result.url)
        return
      }
      await mutateConnect()
      setMessage(result.payoutsEnabled ? 'Stripe payouts are ready for your account.' : 'Refresh the page after finishing Stripe setup.')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not start Stripe onboarding.')
    } finally {
      setBusyKey(null)
    }
  }

  async function fundQuest(questId: string) {
    setBusyKey(`fund-${questId}`)
    setActionError(null)
    try {
      const result = await postJson<{ checkoutUrl: string | null; alreadyPaid: boolean; awaitingPayment?: boolean }>(`/api/quests/${questId}/fund`)
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }
      setMessage(result.alreadyPaid ? 'Payment is confirmed. The quest will appear after Stripe verifies the payment.' : result.awaitingPayment ? 'Stripe is still processing this payment. The quest will publish when it succeeds.' : 'Payment is being verified by Stripe.')
      await mutateWork()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not start funding.')
    } finally {
      setBusyKey(null)
    }
  }

  async function submitWork(questId: string) {
    setBusyKey(`submit-${questId}`)
    setActionError(null)
    try {
      await postJson(`/api/quests/${questId}/submit`, { note: notes[questId] ?? '' })
      setMessage('Completion report sent to the quest author for review.')
      setNotes((current) => ({ ...current, [questId]: '' }))
      await mutateWork()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not submit your work.')
    } finally {
      setBusyKey(null)
    }
  }

  async function reviewWork(questId: string, decision: 'approve' | 'reject') {
    setBusyKey(`${decision}-${questId}`)
    setActionError(null)
    try {
      await postJson(`/api/quests/${questId}/decision`, { decision })
      setMessage(decision === 'approve' ? 'Payout sent to the claimant’s connected Stripe account.' : 'Submission declined and the funded quest is open for another claimant.')
      await mutateWork()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not review this submission.')
    } finally {
      setBusyKey(null)
    }
  }

  const authored = work?.authored ?? []
  const claims = work?.claims ?? []
  const payoutReady = Boolean(connect?.payoutsEnabled)

  return (
    <section className="grid gap-4 xl:grid-cols-2" aria-label="Quest funding and work">
      <Card className="border-primary/20 bg-primary/[0.025]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><CircleDollarSign className="size-4 text-primary" aria-hidden="true" /> Stripe payouts</CardTitle>
              <CardDescription className="mt-1">Connect a Stripe Express account before claiming funded work. Payouts are sent only after the quest author approves a completion report.</CardDescription>
            </div>
            <Badge variant="outline" className={payoutReady ? 'shrink-0 border-success/30 text-success' : 'shrink-0'}>
              {payoutReady ? 'READY' : 'SETUP NEEDED'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant={payoutReady ? 'outline' : 'default'} onClick={() => void connectPayouts()} disabled={busyKey === 'connect'}>
              {busyKey === 'connect' ? <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" /> : payoutReady ? <RotateCw data-icon="inline-start" aria-hidden="true" /> : <ArrowUpRight data-icon="inline-start" aria-hidden="true" />}
              {busyKey === 'connect' ? 'Checking Stripe…' : payoutReady ? 'Refresh payout status' : 'Connect Stripe payouts'}
            </Button>
            {connect?.detailsSubmitted && !connect.payoutsEnabled && <p className="text-xs text-muted-foreground">Stripe is still reviewing the account or needs more information.</p>}
            {connectError && <p role="status" className="text-xs text-muted-foreground">{connectError.message}</p>}
            {isLoading && <p className="text-xs text-muted-foreground">Loading your quest activity…</p>}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Stripe handles identity verification and bank details directly. Aegis does not store payout credentials.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" aria-hidden="true" /> My quests & work</CardTitle>
          <CardDescription>Resume funding, report completed work, and review claimant submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(message || actionError || workError) && (
            <p role={actionError || workError ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-xs ${actionError || workError ? 'border-destructive/30 text-destructive' : 'border-primary/20 text-muted-foreground'}`}>
              {actionError ?? workError?.message ?? message}
            </p>
          )}
          {!isLoading && authored.length === 0 && claims.length === 0 && !workError && (
            <p className="text-sm text-muted-foreground">No quest activity yet. Funded quests you create and work you claim will appear here.</p>
          )}

          {authored.map((quest) => (
            <div key={quest.id} className="rounded-lg border border-border/70 bg-secondary/15 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{quest.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatMoney(quest.reward_amount)} · {quest.location_label}</p>
                </div>
                <Badge variant="outline" className="capitalize">{quest.status.replace('_', ' ')}</Badge>
              </div>
              {quest.status === 'pending_payment' && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Payment is required before this quest is published.</p>
                  <Button size="sm" onClick={() => void fundQuest(quest.id)} disabled={busyKey === `fund-${quest.id}`}>
                    {busyKey === `fund-${quest.id}` ? 'Opening Checkout…' : 'Fund with Stripe'}
                  </Button>
                </div>
              )}
              {quest.status === 'open' && <p className="mt-2 text-xs text-success">Funded and visible on the public map.</p>}
              {quest.claim && (
                <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium">Claimant {quest.claim.claimant_id.slice(0, 8)}</p>
                    <Badge variant="secondary" className="capitalize">{quest.claim.status.replace('_', ' ')}</Badge>
                  </div>
                  {quest.claim.completion_note && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{quest.claim.completion_note}</p>}
                  {(quest.claim.status === 'submitted' || quest.claim.status === 'payout_pending') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void reviewWork(quest.id, 'approve')} disabled={busyKey === `approve-${quest.id}`}>
                        {busyKey === `approve-${quest.id}` ? 'Processing payout…' : 'Approve & pay'}
                      </Button>
                      {quest.claim.status === 'submitted' && (
                        <Button size="sm" variant="outline" onClick={() => void reviewWork(quest.id, 'reject')} disabled={busyKey === `reject-${quest.id}`}>
                          Decline & reopen
                        </Button>
                      )}
                    </div>
                  )}
                  {quest.claim.status === 'payout_pending' && <p className="mt-2 text-xs text-muted-foreground">A payout was started. Retry approval safely if its status has not refreshed.</p>}
                </div>
              )}
            </div>
          ))}

          {claims.map((claim) => (
            <div key={claim.id} className="rounded-lg border border-border/70 bg-secondary/15 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{claim.quest?.title ?? 'Quest'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{claim.quest ? `${formatMoney(claim.quest.reward_amount)} · ${claim.quest.location_label}` : 'Quest details unavailable'}</p>
                </div>
                <Badge variant="outline" className="capitalize">{claim.status.replace('_', ' ')}</Badge>
              </div>
              {claim.status === 'claimed' && (
                <div className="mt-3 space-y-2">
                  <label htmlFor={`completion-${claim.id}`} className="text-xs font-medium">Completion report</label>
                  <Textarea id={`completion-${claim.id}`} minLength={10} maxLength={2000} value={notes[claim.quest_id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [claim.quest_id]: event.target.value }))} placeholder="Describe what you completed and include relevant evidence or observations." className="min-h-20 text-xs" />
                  <Button size="sm" onClick={() => void submitWork(claim.quest_id)} disabled={busyKey === `submit-${claim.quest_id}`}>
                    {busyKey === `submit-${claim.quest_id}` ? 'Submitting…' : 'Submit for review'}
                  </Button>
                </div>
              )}
              {claim.status === 'submitted' && <p className="mt-2 text-xs text-muted-foreground">Your report is awaiting the quest author’s review.</p>}
              {claim.status === 'payout_pending' && <p className="mt-2 text-xs text-muted-foreground">The author has started your payout. Stripe is processing the transfer.</p>}
              {claim.status === 'paid' && <p className="mt-2 flex items-center gap-1.5 text-xs text-success"><Check className="size-3.5" aria-hidden="true" />Payout approved and sent to your connected Stripe account.</p>}
              {claim.status === 'rejected' && <p className="mt-2 text-xs text-muted-foreground">The submission was declined; the funded quest has reopened for another claimant.</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value))
}
