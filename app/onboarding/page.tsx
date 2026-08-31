'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Fingerprint, KeyRound, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HashChip } from '@/components/hash-chip'
import { useAegis } from '@/lib/store'

export default function OnboardingPage() {
  const router = useRouter()
  const { identity, createIdentity, ready } = useAegis()
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [phase, setPhase] = useState<'form' | 'minting' | 'done'>('form')

  const existing = ready && identity && phase === 'form'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !handle.trim()) return
    setPhase('minting')
    // brief, real key-generation delay for effect
    await new Promise((r) => setTimeout(r, 900))
    await createIdentity(displayName.trim(), handle.trim())
    setPhase('done')
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <span className="font-mono text-xs text-muted-foreground">step 1 of 1</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col items-center px-6 py-16">
        {existing ? (
          <div className="w-full rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-secondary/50 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An identity already lives in this vault as{' '}
              <span className="font-medium text-foreground">{identity!.displayName}</span>.
            </p>
            <div className="mt-4 flex justify-center">
              <HashChip label="DID" value={identity!.did} />
            </div>
            <Button className="mt-6 w-full" onClick={() => router.push('/dashboard')}>
              Enter your vault <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : phase === 'form' ? (
          <div className="w-full">
            <div className="text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-secondary/50 text-primary">
                <Fingerprint className="size-6" />
              </div>
              <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight">
                Mint your sovereign identity
              </h1>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Keys are generated locally on this device. No email, no custodian —
                you hold the root of trust.
              </p>
            </div>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="handle">Handle</Label>
                <div className="flex items-center rounded-md border border-input bg-transparent focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-3 font-mono text-sm text-muted-foreground">@</span>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                    placeholder="ada"
                    autoComplete="off"
                    className="border-0 focus-visible:ring-0"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Becomes part of your DID: <span className="font-mono">did:aegis:{handle || 'handle'}:…</span>
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" />
                <p>
                  This is a prototype. Your identity is stored locally in this browser.
                  Connect a database to persist it across devices.
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Generate keypair <KeyRound className="size-4" />
              </Button>
            </form>
          </div>
        ) : phase === 'minting' ? (
          <div className="flex w-full flex-col items-center gap-6 py-12">
            <div className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="grid size-20 place-items-center rounded-full border border-primary/40 bg-card">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium">Generating Ed25519 keypair…</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                deriving address · mining genesis block · seeding mesh
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-success/30 bg-card p-8">
            <div className="text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
                <ShieldCheck className="size-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Identity minted</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your sovereign identity is live and anchored to the genesis block.
              </p>
            </div>

            {identity && (
              <div className="mt-6 flex flex-col gap-3">
                <Field label="Decentralized identifier">
                  <HashChip value={identity.did} full />
                </Field>
                <Field label="Wallet address">
                  <HashChip value={identity.address} />
                </Field>
                <Field label="Public key">
                  <HashChip value={identity.publicKey} />
                </Field>
              </div>
            )}

            <Button className="mt-7 w-full" size="lg" onClick={() => router.push('/dashboard')}>
              Enter your vault <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-secondary/30 p-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
