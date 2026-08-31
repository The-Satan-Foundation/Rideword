'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  CircleSlash,
  Minus,
  TriangleAlert,
  Trash2,
  Anchor,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Credential, VerificationCheck } from '@/lib/types'
import { useAegis } from '@/lib/store'
import { StatusBadge } from '@/components/status-badge'
import { ZkBadge } from '@/components/zk-badge'
import { HashChip } from '@/components/hash-chip'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const CHECK_ICON: Record<VerificationCheck['status'], { Icon: typeof Check; cls: string }> = {
  pass: { Icon: Check, cls: 'text-success' },
  fail: { Icon: CircleSlash, cls: 'text-destructive' },
  warn: { Icon: TriangleAlert, cls: 'text-accent' },
  skipped: { Icon: Minus, cls: 'text-muted-foreground' },
}

export function CredentialCard({ credential }: { credential: Credential }) {
  const { removeCredential, anchorCredential } = useAegis()
  const [open, setOpen] = useState(false)
  const v = credential.verification

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{credential.title}</h3>
            {credential.anchored && <ZkBadge />}
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {credential.issuer}
            {credential.issuerDomain ? ` · ${credential.issuerDomain}` : ''}
          </p>
          {v?.consortiumIssuer && (
            <p className="text-xs text-success">Attested by {v.consortiumIssuer}</p>
          )}
          {credential.status === 'pending_issuer' && (
            <p className="text-xs text-accent">
              Held privately — {credential.issuer} hasn&apos;t joined the consortium yet.
            </p>
          )}
        </div>
        <StatusBadge status={credential.status} />
      </div>

      {v && (
        <div className="border-t border-border/60 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Verification confidence</span>
                <span className="font-mono tabular-nums">{v.confidence}%</span>
              </div>
              <Progress value={v.confidence} className="mt-1.5 h-1.5" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => setOpen((o) => !o)}
            >
              {v.checks.length} checks
              <ChevronDown className={cn('ml-1 size-3.5 transition', open && 'rotate-180')} />
            </Button>
          </div>

          {open && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">{v.summary}</p>
              <ul className="space-y-2">
                {v.checks.map((c) => {
                  const { Icon, cls } = CHECK_ICON[c.status]
                  return (
                    <li key={c.id} className="flex gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
                      <Icon className={cn('mt-0.5 size-4 shrink-0', cls)} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium">{c.label}</p>
                          {c.requiresCredentials && (
                            <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">
                              opt-in pending
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                        {c.detail && (
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">{c.detail}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {v.scannedSources.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Sources checked
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {v.scannedSources.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {credential.anchored && credential.anchoredBlockHash && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Anchored to ledger
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    <HashChip value={credential.anchoredBlockHash} label="block" />
                    {credential.zkCommitment && (
                      <HashChip value={credential.zkCommitment} label="zk-commit" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
        {credential.status === 'verified' && !credential.anchored && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={async () => {
              await anchorCredential(credential.id)
              toast.success('Anchored to the ledger.')
            }}
          >
            <Anchor className="mr-1 size-3.5" /> Anchor
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            removeCredential(credential.id)
            toast('Credential removed.')
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </Card>
  )
}
