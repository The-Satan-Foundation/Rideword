'use client'

import { useState } from 'react'
import { ScanFace } from 'lucide-react'
import { useAegis } from '@/lib/store'
import { UploadCredential } from '@/components/dashboard/upload-credential'
import { CredentialCard } from '@/components/dashboard/credential-card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'

type Filter = 'all' | 'verified' | 'pending_issuer' | 'needs_review'

export default function CredentialsPage() {
  const { credentials } = useAegis()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = credentials.filter((c) => {
    if (filter === 'all') return true
    return c.status === filter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Credentials</h1>
          <p className="text-sm text-muted-foreground">
            Upload, verify against opted-in issuers, and anchor with a zero-knowledge proof.
          </p>
        </div>
        <UploadCredential />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({credentials.length})</TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({credentials.filter((c) => c.status === 'verified').length})
          </TabsTrigger>
          <TabsTrigger value="pending_issuer">
            Awaiting issuer ({credentials.filter((c) => c.status === 'pending_issuer').length})
          </TabsTrigger>
          <TabsTrigger value="needs_review">
            Review ({credentials.filter((c) => c.status === 'needs_review').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-xl border border-border bg-secondary/40">
            <ScanFace className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {credentials.length === 0 ? 'No credentials yet' : 'Nothing in this view'}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Add a credential and Aegis will verify it against the opted-in issuer consortium, then
            anchor a private proof to your identity ledger.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <CredentialCard key={c.id} credential={c} />
          ))}
        </div>
      )}
    </div>
  )
}
