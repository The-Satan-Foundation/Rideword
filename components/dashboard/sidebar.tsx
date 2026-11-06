'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangle, Boxes, Bot, LayoutGrid, MessageSquare, Network, ScanFace, Wallet } from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutGrid },
  { href: '/dashboard/credentials', label: 'Credentials', Icon: ScanFace },
  { href: '/dashboard/incidents', label: 'Field incidents', Icon: AlertTriangle },
  { href: '/dashboard/companion', label: 'AI companion', Icon: Bot },
  { href: '/dashboard/wallet', label: 'Wallet', Icon: Wallet },
  { href: '/dashboard/ledger', label: 'Ledger', Icon: Boxes },
  { href: '/dashboard/network', label: 'Mesh network', Icon: Network },
  { href: '/dashboard/messages', label: 'Node messages', Icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar px-4 py-5 lg:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-secondary/30 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Network</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-foreground">
          <span className="size-2 rounded-full bg-success" style={{ animation: 'pulse-node 2s ease-in-out infinite' }} />
          Mesh synced · 13 peers
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="sticky bottom-0 z-40 flex items-center justify-around border-t border-border/60 bg-background/90 px-2 py-2 backdrop-blur-xl lg:hidden">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-medium transition',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
