import { Hexagon, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative grid size-8 place-items-center">
        <Hexagon className="size-8 text-primary" strokeWidth={1.5} />
        <ShieldCheck className="absolute size-4 text-primary" strokeWidth={2} />
      </span>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Aegis
        </span>
      )}
    </span>
  )
}
