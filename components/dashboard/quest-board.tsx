'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { AlertCircle, Compass, Globe2, LocateFixed, LogOut, MapPin, Plus, Radio, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { QuestAuthPanel } from '@/components/dashboard/quest-auth-panel'
import { QuestForm } from '@/components/dashboard/quest-form'
import { QuestPaymentPanel } from '@/components/dashboard/quest-payment-panel'
import { createClient } from '@/lib/supabase/client'
import { CREDENTIAL_LABELS, type Quest, type QuestPayload, type QuestPoint } from '@/lib/quests'

const QuestsMap = dynamic(
  () => import('@/components/dashboard/quests-map').then((module) => module.QuestsMap),
  { ssr: false, loading: () => <div className="h-[min(62vh,620px)] min-h-[360px] animate-pulse rounded-xl border border-border bg-secondary/30" /> },
)

interface QuestsResponse {
  quests: Quest[]
  user: { id: string; email: string | null } | null
}

async function fetchQuests(url: string): Promise<QuestsResponse> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Could not load quests.')
  return body
}

export function QuestBoard() {
  const { data, error, isLoading, mutate } = useSWR<QuestsResponse>('/api/quests', fetchQuests, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  const { mutate: mutateCache } = useSWRConfig()
  const [view, setView] = useState<'local' | 'global'>('global')
  const [localCenter, setLocalCenter] = useState<QuestPoint | null>(null)
  const [mapCenter, setMapCenter] = useState<QuestPoint & { zoom: number }>({ latitude: 20, longitude: 0, zoom: 1.4 })
  const [draftPoint, setDraftPoint] = useState<QuestPoint | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const quests = data?.quests ?? []
  const user = data?.user ?? null
  const visibleQuests = useMemo(() => {
    if (view === 'global') return quests
    if (!localCenter) return []
    return quests.filter((quest) => {
      if (quest.scope === 'global') return true
      return distanceKm(localCenter, quest) <= (quest.radius_km ?? 0)
    })
  }, [localCenter, quests, view])
  const selectedQuest = visibleQuests.find((quest) => quest.id === selectedId) ?? visibleQuests[0] ?? null

  async function publishQuest(payload: QuestPayload) {
    const response = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Could not publish this quest.')
    setShowCreate(false)
    setDraftPoint(null)
    if (result.checkoutUrl) {
      setNotice('Quest saved as pending. Redirecting to secure Stripe Checkout…')
      window.location.assign(result.checkoutUrl)
      return
    }
    await mutate()
    setNotice(result.alreadyPaid ? 'Payment is confirmed. The quest will appear after Stripe verifies the payment.' : 'Payment is processing. The quest will appear after Stripe confirms it.')
  }

  function setCurrentLocation() {
    setNotice(null)
    if (!navigator.geolocation) {
      setNotice('Location services are not available in this browser. Click the map to choose an area instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude }
        setLocalCenter(point)
        setMapCenter({ ...point, zoom: 8 })
        setView('local')
        setNotice('Local area set on this device. Your location is not saved with a quest unless you place its pin there.')
      },
      () => setNotice('Location permission was unavailable. Click the map to choose your local area.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  function handleMapClick(point: QuestPoint) {
    if (showCreate) {
      setDraftPoint(point)
      setNotice('Quest pin placed. Review the coordinates and location label before publishing.')
      return
    }
    setLocalCenter(point)
    setMapCenter({ ...point, zoom: 7 })
    setNotice('Local area set from the map selection.')
  }

  async function signOut() {
    setIsSigningOut(true)
    await createClient().auth.signOut()
    await mutate()
    setIsSigningOut(false)
    setNotice('Signed out. Open quests remain publicly visible.')
  }

  async function claimQuest() {
    if (!selectedQuest) return
    setIsClaiming(true)
    setNotice(null)
    try {
      const response = await fetch(`/api/quests/${selectedQuest.id}/claim`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not claim this quest.')
      await Promise.all([mutate(), mutateCache('/api/quests/mine')])
      setSelectedId(null)
      setNotice('Quest claimed. Complete the work and submit a report from My quests & work.')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Could not claim this quest.')
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-primary">
            <Compass className="size-3.5" aria-hidden="true" /> Field quest network
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Quests & bounties</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Browse funded USD field work by location and credential request. New quests appear publicly only after Stripe confirms payment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            aria-label="Quest map range"
            value={[view]}
            onValueChange={(values) => {
              const next = values[0]
              if (next === 'local' || next === 'global') setView(next)
            }}
            className="rounded-lg border border-border bg-card p-1"
          >
            <ToggleGroupItem value="local" className="border-0 text-muted-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary">
              <MapPin data-icon="inline-start" aria-hidden="true" /> Local
            </ToggleGroupItem>
            <ToggleGroupItem value="global" className="border-0 text-muted-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary">
              <Globe2 data-icon="inline-start" aria-hidden="true" /> Global
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" onClick={setCurrentLocation}>
            <LocateFixed data-icon="inline-start" aria-hidden="true" /> Use my location
          </Button>
          {user ? (
            <Button onClick={() => { setShowCreate((value) => !value); setNotice(null) }}>
              <Plus data-icon="inline-start" aria-hidden="true" /> {showCreate ? 'Close form' : 'Post a quest'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => document.getElementById('quest-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              <Plus data-icon="inline-start" aria-hidden="true" /> Sign in to post
            </Button>
          )}
        </div>
      </header>

      {user && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="truncate text-muted-foreground">Posting as <span className="text-foreground">{user.email ?? 'authenticated Aegis account'}</span></span>
            <Badge variant="outline" className="hidden border-success/30 text-success sm:inline-flex">AUTHENTICATED</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} disabled={isSigningOut}>
            <LogOut data-icon="inline-start" aria-hidden="true" /> {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      )}

      {!user && <div id="quest-account"><QuestAuthPanel onAuthenticated={() => { void mutate(); setNotice('Signed in. You can now publish a quest.') }} /></div>}

      {showCreate && user && <QuestForm point={draftPoint} onPointChange={setDraftPoint} onCancel={() => { setShowCreate(false); setDraftPoint(null) }} onSubmit={publishQuest} />}
      {user && <QuestPaymentPanel userId={user.id} />}

      {notice && <p role="status" className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">{notice}</p>}
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertCircle className="size-4" aria-hidden="true" />{error.message}</p>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)]">
        <section aria-label="Quest map" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{view === 'global' ? 'Global field map' : 'Local field map'}</h2>
              <p className="text-xs text-muted-foreground">{visibleQuests.length} open {visibleQuests.length === 1 ? 'quest' : 'quests'} shown{view === 'local' && localCenter ? ' around your selected area' : ''}</p>
            </div>
            <Badge variant="outline" className="gap-1.5 border-success/30 text-success"><span className="size-1.5 rounded-full bg-success" /> PUBLIC FEED</Badge>
          </div>
          <QuestsMap
            quests={visibleQuests}
            center={mapCenter}
            draftPoint={showCreate ? draftPoint : null}
            selectedId={selectedQuest?.id ?? null}
            onSelect={setSelectedId}
            onMapClick={handleMapClick}
          />
          <p className="mt-2 text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Click the map to set a local area, or open the post form first to place a quest geopin.</p>
        </section>

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Open quests">
          <Card className="min-h-40">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Selected quest</CardTitle></CardHeader>
            <CardContent>
              {selectedQuest ? (
                <>
                  <QuestSummary quest={selectedQuest} />
                  {user && !selectedQuest.is_author && selectedQuest.funding_status === 'funded' && (
                    <Button className="mt-4 w-full" onClick={() => void claimQuest()} disabled={isClaiming}>
                      {isClaiming ? 'Claiming…' : 'Claim funded quest'}
                    </Button>
                  )}
                  {selectedQuest.funding_status !== 'funded' && <p className="mt-4 text-xs text-muted-foreground">This listing has no verified Stripe funding and cannot be claimed in this workflow.</p>}
                </>
              ) : <p className="py-5 text-sm text-muted-foreground">Select a map pin or quest below to inspect the public details.</p>}
            </CardContent>
          </Card>
          <Card className="min-h-64 overflow-hidden">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span>Open quests</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">{isLoading ? '…' : visibleQuests.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[430px] overflow-y-auto p-0">
              {isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading the public quest feed…</p> : view === 'local' && !localCenter ? (
                <div className="p-5 text-sm text-muted-foreground">Choose a local area with the location button or click anywhere on the map.</div>
              ) : visibleQuests.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No open quests in this view yet. Signed-in holders can post the first one.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {visibleQuests.map((quest) => <QuestListItem key={quest.id} quest={quest} selected={selectedQuest?.id === quest.id} onSelect={() => setSelectedId(quest.id)} />)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/[0.035] p-4">
            <div className="flex gap-3"><Radio className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /><div><p className="text-sm font-medium">Credential minimums are requests</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Credential minimums are requests, not verified eligibility checks in this release. USD bounties are funded through Stripe Checkout and paid to a claimant’s connected Stripe account only after the quest author approves submitted work.</p></div></div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function QuestSummary({ quest }: { quest: Quest }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{quest.scope}</Badge>
        {quest.scope === 'local' && <Badge variant="secondary">{quest.radius_km} km radius</Badge>}
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{quest.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{quest.location_label}</p>
      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{quest.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="secondary">Min: {CREDENTIAL_LABELS[quest.credential_minimum]}</Badge>
        <Badge variant="outline" className="border-accent/30 text-accent">{formatReward(quest)}</Badge>
        {quest.funding_status === 'funded' && <Badge variant="outline" className="border-success/30 text-success">FUNDED</Badge>}
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">{new Date(quest.created_at).toLocaleString()}</p>
    </div>
  )
}

function QuestListItem({ quest, selected, onSelect }: { quest: Quest; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`w-full p-4 text-left transition hover:bg-secondary/40 ${selected ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{quest.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{quest.location_label}</p>
        </div>
        <Badge variant="outline" className="shrink-0 border-accent/30 text-accent">{formatReward(quest)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="capitalize">{quest.scope}{quest.scope === 'local' && quest.radius_km ? ` · ${quest.radius_km} km` : ''}</span>
        <span>·</span>
        <span>{CREDENTIAL_LABELS[quest.credential_minimum]}</span>
      </div>
    </button>
  )
}

function formatReward(quest: Quest) {
  const amount = Number(quest.reward_amount)
  return quest.reward_currency === 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
    : `${amount.toLocaleString(undefined, { maximumFractionDigits: 9 })} SOL`
}

function distanceKm(origin: QuestPoint, destination: QuestPoint) {
  const radians = (degree: number) => (degree * Math.PI) / 180
  const latitudeDelta = radians(destination.latitude - origin.latitude)
  const longitudeDelta = radians(destination.longitude - origin.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
