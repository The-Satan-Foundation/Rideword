'use client'

import Link from 'next/link'
import { ArrowUpRight, Radio, ShieldCheck, TrendingUp, Wallet2 } from 'lucide-react'
import { useAegis } from '@/lib/store'
import { IdentityPassport } from '@/components/dashboard/identity-passport'
import { StatusBadge } from '@/components/status-badge'
import { ZkBadge } from '@/components/zk-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function OverviewPage() {
  const { identity, credentials, wallet, nodes, blocks } = useAegis()
  if (!identity) return null

  const verified = credentials.filter((c) => c.status === 'verified')
  const pendingIssuer = credentials.filter((c) => c.status === 'pending_issuer')
  const onlineNodes = nodes.filter((n) => n.status === 'online').length
  const identityToken = wallet.find((w) => w.kind === 'identity_token')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Welcome back, {identity.displayName.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your identity lives on the mesh — verifiable anywhere, owned by no one but you.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <IdentityPassport identity={identity} verifiedCount={verified.length} />
        </div>

        <div className="grid gap-4 lg:col-span-2">
          {/* Trust score */}
          <Card className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Trust score
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{identity.trustScore}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">out of 100</p>
            </div>
            <TrustRing score={identity.trustScore} />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <MiniStat
              Icon={Wallet2}
              label="Identity token"
              value={`${identityToken?.balance ?? 0}`}
              sub="AEG"
            />
            <MiniStat
              Icon={Radio}
              label="Mesh peers"
              value={`${onlineNodes}`}
              sub={`${nodes.length} total`}
            />
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard Icon={ShieldCheck} label="Verified & anchored" value={verified.length} tone="success" />
        <StatCard Icon={Radio} label="Awaiting issuer opt-in" value={pendingIssuer.length} tone="accent" />
        <StatCard Icon={TrendingUp} label="Ledger blocks" value={blocks.length} tone="primary" />
      </div>

      {/* Recent credentials */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent credentials</h2>
          <Button
            render={<Link href="/dashboard/credentials" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            View all <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border/60">
          {credentials.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No credentials yet.</p>
              <Button
                render={<Link href="/dashboard/credentials" />}
                nativeButton={false}
                size="sm"
                className="mt-3"
              >
                Add your first credential
              </Button>
            </div>
          )}
          {credentials.slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{c.issuer}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.anchored && <ZkBadge />}
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function TrustRing({ score }: { score: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

function MiniStat({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Radio
  label: string
  value: string
  sub: string
}) {
  return (
    <Card className="p-4">
      <Icon className="size-4 text-primary" strokeWidth={1.75} />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value} <span className="text-xs font-normal text-muted-foreground">{sub}</span>
      </p>
    </Card>
  )
}

function StatCard({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Radio
  label: string
  value: number
  tone: 'success' | 'accent' | 'primary'
}) {
  const toneMap = {
    success: 'text-success',
    accent: 'text-accent',
    primary: 'text-primary',
  }
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`grid size-11 place-items-center rounded-lg border border-border bg-secondary/40 ${toneMap[tone]}`}>
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}
