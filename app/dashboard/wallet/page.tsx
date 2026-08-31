'use client'

import { ArrowDownLeft, ArrowUpRight, Coins, Shield, Star } from 'lucide-react'
import { useAegis } from '@/lib/store'
import type { WalletAsset } from '@/lib/types'
import { HashChip } from '@/components/hash-chip'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const KIND_META: Record<WalletAsset['kind'], { Icon: typeof Coins; cls: string }> = {
  identity_token: { Icon: Shield, cls: 'text-primary' },
  stablecoin: { Icon: Coins, cls: 'text-success' },
  reputation: { Icon: Star, cls: 'text-accent' },
}

export default function WalletPage() {
  const { identity, wallet, blocks, credentials } = useAegis()
  if (!identity) return null

  const totalFiat = wallet.reduce((acc, a) => acc + a.fiatValue, 0)
  const anchoredEvents = blocks.filter((b) => b.type === 'credential_anchor')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Assets and reputation bound to your sovereign identity, secured on the mesh.
        </p>
      </div>

      {/* Balance hero */}
      <Card className="relative overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Total balance
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              ${totalFiat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-2">
              <HashChip value={identity.address} label="addr" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <ArrowUpRight className="mr-1 size-4" /> Send
            </Button>
            <Button size="sm">
              <ArrowDownLeft className="mr-1 size-4" /> Receive
            </Button>
          </div>
        </div>
      </Card>

      {/* Assets */}
      <div className="grid gap-4 sm:grid-cols-3">
        {wallet.map((asset) => {
          const { Icon, cls } = KIND_META[asset.kind]
          return (
            <Card key={asset.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className={`grid size-10 place-items-center rounded-lg border border-border bg-secondary/40 ${cls}`}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{asset.symbol}</span>
              </div>
              <p className="mt-4 text-2xl font-semibold tabular-nums">
                {asset.balance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{asset.name}</p>
              {asset.fiatValue > 0 && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  ≈ ${asset.fiatValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {/* Activity */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Ledger activity</h2>
        <div className="mt-4 divide-y divide-border/60">
          {anchoredEvents.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No on-chain activity yet. Verify a credential to mint your first anchor.
            </p>
          )}
          {anchoredEvents
            .slice()
            .reverse()
            .map((b) => {
              const cred = credentials.find((c) => c.id === b.credentialId)
              return (
                <div key={b.hash} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
                      <Shield className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {cred?.title ?? b.payloadLabel}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        Block #{b.index} · +10 REP
                      </p>
                    </div>
                  </div>
                  <HashChip value={b.hash} />
                </div>
              )
            })}
        </div>
      </Card>
    </div>
  )
}
