import { FileLock2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shortHash } from '@/lib/crypto'

export function ZkBadge({
  commitment,
  className,
}: {
  commitment?: string
  className?: string
}) {
  if (!commitment) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-chart-4/30 bg-chart-4/10 px-2 py-1 font-mono text-[11px] text-chart-4',
        className,
      )}
      title={`Zero-knowledge commitment: ${commitment}`}
    >
      <FileLock2 className="size-3.5" />
      ZK {shortHash(commitment, 6, 4)}
    </span>
  )
}
