'use client'

import { AegisProvider } from '@/lib/store'
import { AppearanceSync } from '@/lib/appearance'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AegisProvider>
      <AppearanceSync />
      {children}
      <Toaster position="bottom-right" />
    </AegisProvider>
  )
}
