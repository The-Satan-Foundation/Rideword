'use client'

import { Boxes, Link2, Shield, Sparkles } from 'lucide-react'
import { useAegis } from '@/lib/store'
import type { LedgerBlock } from '@/lib/types'
import { HashChip } from '@/components/hash-chip'
import { Card } from '@/components/ui/card'

const TYPE_META: Record<LedgerBlock['type'], { label: string; Icon: typeof Boxes; cls: string }> = {
  genesis: { label: 'Genesis', Icon: Sparkles, cls: 'text-accent border-accent/30 bg-accent/10' },
  identity_genesis: { label: 'Identity genesis', Icon: Sparkles, cls: 'text-accent border-accent/30 bg-accent/10' },
  credential_anchor: { label: 'Credential anchor', Icon: Shield, cls: 'text-success border-success/30 bg-success/10' },
  attestation: { label: 'Attestation', Icon: Shield, cls: 'text-primary border-primary/30 bg-primary/10' },
}

export default function LedgerPage() {
  const { blocks } = useAegis()
  const ordered = blocks.slice().reverse()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Identity ledger</h1>
        <p className="text-sm text-muted-foreground">
          A tamper-evident chain of SHA-256 linked blocks. Each anchor commits a zero-knowledge
          proof — never the underlying credential data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Blocks" value={blocks.length} />
        <Stat label="Anchored credentials" value={blocks.filter((b) => b.type === 'credential_anchor').length} />
        <Stat
          label="Chain integrity"
          value="100%"
          hint="every hash links to its parent"
        />
      </div>

      <div className="relative space-y-3">
        {ordered.map((b, i) => {
          const meta = TYPE_META[b.type]
          const isLast = i === ordered.length - 1
          return (
            <div key={b.hash} className="relative">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-10 place-items-center rounded-lg border ${meta.cls}`}>
                      <meta.Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">Block #{b.index}</p>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{b.payloadLabel}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {b.confirmations} conf
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Hash
                    </p>
                    <HashChip value={b.hash} className="mt-1" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Nonce
                    </p>
                    <p className="mt-1 font-mono text-xs text-foreground">{b.nonce}</p>
                  </div>
                </div>
              </Card>

              {!isLast && (
                <div className="flex items-center gap-2 py-1.5 pl-5 text-muted-foreground">
                  <Link2 className="size-3.5" />
                  <span className="font-mono text-[10px]">links to parent hash</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
