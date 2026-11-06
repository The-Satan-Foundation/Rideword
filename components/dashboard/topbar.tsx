'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, MessageSquare, RefreshCw, Users } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HashChip } from '@/components/hash-chip'
import { useAegis } from '@/lib/store'

export function Topbar() {
  const router = useRouter()
  const { identity, resetAll } = useAegis()
  if (!identity) return null

  const initials = identity.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const reset = () => {
    resetAll()
    router.push('/onboarding')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-end gap-4 border-b border-border/60 bg-background/70 px-5 py-3.5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <HashChip label="addr" value={identity.address} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-1 pr-3 transition hover:border-primary/40">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:block">{identity.displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>{identity.displayName}</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">@{identity.handle}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <HashChip label="DID" value={identity.did} className="w-full" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/messages"><MessageSquare className="size-4" /> Node messages</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/network"><Users className="size-4" /> Contacts & mesh</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.refresh()}>
              <RefreshCw className="size-4" /> Refresh
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={reset}>
              <LogOut className="size-4" /> Reset identity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
