'use client'

import { ShieldCheck } from 'lucide-react'
import type { Identity } from '@/lib/types'
import { HashChip } from '@/components/hash-chip'
import { Logo } from '@/components/logo'

export function IdentityPassport({
  identity,
  verifiedCount,
}: {
  identity: Identity
  verifiedCount: number
}) {
  const initials = identity.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/40 p-6">
      {/* guilloché-style security texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Logo showWordmark={false} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sovereign Identity
            </p>
            <p className="font-mono text-xs text-primary">AEGIS · PASSPORT</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
          <ShieldCheck className="size-3.5" />
          Active
        </span>
      </div>

      <div className="relative mt-6 flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-xl font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{identity.displayName}</p>
          <p className="font-mono text-sm text-muted-foreground">@{identity.handle}</p>
        </div>
      </div>

      <dl className="relative mt-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">DID</dt>
          <dd className="mt-1">
            <HashChip value={identity.did} className="max-w-full" />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Wallet address
          </dt>
          <dd className="mt-1">
            <HashChip value={identity.address} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Verified credentials
          </dt>
          <dd className="mt-1 font-mono text-sm text-foreground">
            {verifiedCount} anchored
          </dd>
        </div>
      </dl>
    </div>
  )
}
