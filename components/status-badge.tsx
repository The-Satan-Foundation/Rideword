import {
  BadgeCheck,
  CircleAlert,
  CircleSlash,
  Loader2,
  ShieldQuestion,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificationStatus } from '@/lib/types'

const CONFIG: Record<
  VerificationStatus,
  { label: string; className: string; Icon: typeof BadgeCheck; spin?: boolean }
> = {
  verified: {
    label: 'Verified',
    className: 'border-success/30 bg-success/10 text-success',
    Icon: BadgeCheck,
  },
  verifying: {
    label: 'Verifying',
    className: 'border-primary/30 bg-primary/10 text-primary',
    Icon: Loader2,
    spin: true,
  },
  pending: {
    label: 'Pending',
    className: 'border-border bg-secondary text-muted-foreground',
    Icon: ShieldQuestion,
  },
  needs_review: {
    label: 'Needs review',
    className: 'border-accent/40 bg-accent/10 text-accent',
    Icon: CircleAlert,
  },
  rejected: {
    label: 'Rejected',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    Icon: CircleSlash,
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: VerificationStatus
  className?: string
}) {
  const { label, className: cls, Icon, spin } = CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cls,
        className,
      )}
    >
      <Icon className={cn('size-3.5', spin && 'animate-spin')} />
      {label}
    </span>
  )
}
