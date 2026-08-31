'use client'

import { useState } from 'react'
import { Plus, UploadCloud, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAegis } from '@/lib/store'
import { CREDENTIAL_TYPE_OPTIONS } from '@/lib/issuers'
import type { CredentialType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initial = {
  type: 'academic_degree' as CredentialType,
  title: '',
  issuer: '',
  issuerDomain: '',
  subject: '',
  identifier: '',
  issuedDate: '',
  expiryDate: '',
  verificationUrl: '',
  fileName: '',
}

export function UploadCredential() {
  const { addCredential, identity } = useAegis()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initial)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.issuer) {
      toast.error('Add at least a title and issuing institution.')
      return
    }
    setSubmitting(true)
    try {
      const subject = form.subject || identity?.displayName || ''
      const result = await addCredential({ ...form, subject })
      setForm(initial)
      setOpen(false)
      if (result.status === 'verified') {
        toast.success('Credential verified and anchored to the ledger.')
      } else if (result.status === 'pending_issuer') {
        toast.info('Held privately — will verify once the issuer joins the consortium.')
      } else if (result.status === 'rejected') {
        toast.error('Verification failed. Check the credential details.')
      } else {
        toast.warning('Credential added — needs review.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 size-4" /> Add credential
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a credential</DialogTitle>
          <DialogDescription>
            Aegis verifies against opted-in issuers only — it never scrapes your data. Unlisted
            issuers are held privately until they join the network.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">Credential type</Label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CREDENTIAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-popover">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. B.Sc. Computer Science"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="issuer">Issuing institution</Label>
              <Input
                id="issuer"
                placeholder="e.g. MIT"
                value={form.issuer}
                onChange={(e) => set('issuer', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issuerDomain">Issuer domain</Label>
              <Input
                id="issuerDomain"
                placeholder="e.g. mit.edu"
                value={form.issuerDomain}
                onChange={(e) => set('issuerDomain', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Identifier / number</Label>
              <Input
                id="identifier"
                placeholder="optional"
                value={form.identifier}
                onChange={(e) => set('identifier', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verificationUrl">Verification link (optional)</Label>
            <Input
              id="verificationUrl"
              placeholder="https://issuer.edu/verify/..."
              value={form.verificationUrl}
              onChange={(e) => set('verificationUrl', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A public link the issuer provides to confirm this record — the strongest signal.
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-3">
              <UploadCloud className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="document-name.pdf"
                  value={form.fileName}
                  onChange={(e) => set('fileName', e.target.value)}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground">
                  Reference a document — its hash is committed, the file never leaves your device.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" /> Verifying…
                </>
              ) : (
                'Verify & add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
