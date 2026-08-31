'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAegis } from '@/lib/store'
import { Sidebar, MobileNav } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { Logo } from '@/components/logo'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { identity, ready } = useAegis()
  const router = useRouter()

  useEffect(() => {
    if (ready && !identity) router.replace('/onboarding')
  }, [ready, identity, router])

  if (!ready || !identity) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <p className="font-mono text-xs text-muted-foreground animate-pulse">
            {ready ? 'Redirecting to onboarding…' : 'Unlocking vault…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
