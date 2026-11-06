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
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-full border border-primary/40 bg-black shadow-[0_0_24px_-8px_hsl(var(--primary))]">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Satan%20Foundation%20Logo%20Red-T5SoajjuWuJAPNyJcAw2gD1kE45SPA.jpg"
          alt="Satan Foundation sigil"
          className="size-full object-cover"
        />
      </span>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Grimoir
        </span>
      )}
    </span>
  )
}
