'use client'

import { AegisProvider } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AegisProvider>
      {children}
      <Toaster position="bottom-right" />
    </AegisProvider>
  )
}
