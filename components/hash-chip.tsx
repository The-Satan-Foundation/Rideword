'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shortHash } from '@/lib/crypto'

export function HashChip({
  value,
  label,
  full = false,
  className,
}: {
  value: string
  label?: string
  full?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={value}
      className={cn(
        'group inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground',
        className,
      )}
    >
      {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</span>}
      <span className="truncate">{full ? value : shortHash(value, 10, 6)}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-success" />
      ) : (
        <Copy className="size-3 shrink-0 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  )
}
