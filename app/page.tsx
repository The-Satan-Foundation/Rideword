import Link from 'next/link'
import {
  ArrowRight,
  Boxes,
  Fingerprint,
  KeyRound,
  Layers,
  Network,
  ScanSearch,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { HeroVisual } from '@/components/landing/hero-visual'

const STEPS = [
  {
    n: '01',
    Icon: Fingerprint,
    title: 'Mint your sovereign ID',
    body: 'A keypair is generated on your device. Your decentralized identifier (DID) and wallet address are yours alone — no central issuer, no custodian.',
  },
  {
    n: '02',
    Icon: ScanSearch,
    title: 'Upload a credential',
    body: 'Add a passport, degree, license or bank proof. Before anything is stored, it runs through the verification pipeline against authoritative issuers.',
  },
  {
    n: '03',
    Icon: ShieldCheck,
    title: 'Verify against the source',
    body: 'The pipeline resolves the issuer, checks live verification links, validates structure, and cross-references public records — then scores its confidence.',
  },
  {
    n: '04',
    Icon: Layers,
    title: 'Anchor with a ZK proof',
    body: 'Verified credentials are anchored to the ledger with a zero-knowledge commitment, so you can prove validity later without revealing the contents.',
  },
]

const FEATURES = [
  {
    Icon: Wallet,
    title: 'Identity wallet & passport',
    body: 'A single vault for who you are and what you hold — credentials, balances and reputation, portable across borders and services.',
  },
  {
    Icon: Boxes,
    title: 'Blockchain-anchored',
    body: 'Each verified credential is committed to an append-only ledger with real proof-of-work hashing, tamper-evident and independently auditable.',
  },
  {
    Icon: Network,
    title: 'P2P mesh redundancy',
    body: 'Your encrypted shards replicate across a peer mesh. No single point of failure — the network stays available even as nodes drop.',
  },
  {
    Icon: KeyRound,
    title: 'Zero-knowledge proofs',
    body: 'Prove you are over 18, licensed, or a citizen without handing over the underlying document. Reveal the claim, never the data.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#features" className="transition hover:text-foreground">Architecture</a>
            <a href="#verify" className="transition hover:text-foreground">Verification</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/dashboard" />} nativeButton={false} variant="ghost" size="sm">
              Enter app
            </Button>
            <Button render={<Link href="/onboarding" />} nativeButton={false} size="sm">
              Create identity <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            self-sovereign identity protocol
          </span>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Own your identity. Prove anything. Reveal nothing.
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            Aegis is a blockchain-backed digital ID, wallet and passport. Upload a
            credential, we verify it against opted-in issuers, then anchor it to a
            peer-to-peer LoRa mesh with zero-knowledge proofs — no internet required.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button render={<Link href="/onboarding" />} nativeButton={false} size="lg">
              Create your identity <ArrowRight className="size-4" />
            </Button>
            <Button render={<Link href="#how" />} nativeButton={false} variant="outline" size="lg">
              See how it works
            </Button>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
            <div>
              <dt className="font-mono text-2xl font-semibold text-foreground">14</dt>
              <dd className="text-xs text-muted-foreground">mesh regions</dd>
            </div>
            <div>
              <dt className="font-mono text-2xl font-semibold text-foreground">ZK</dt>
              <dd className="text-xs text-muted-foreground">selective disclosure</dd>
            </div>
            <div>
              <dt className="font-mono text-2xl font-semibold text-foreground">0</dt>
              <dd className="text-xs text-muted-foreground">custodians</dd>
            </div>
          </dl>
        </div>
        <HeroVisual />
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">The flow</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From document to decentralized proof
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-4 bg-card p-6">
                <div className="flex items-center justify-between">
                  <s.Icon className="size-6 text-primary" strokeWidth={1.5} />
                  <span className="font-mono text-sm text-muted-foreground/60">{s.n}</span>
                </div>
                <h3 className="text-lg font-medium">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Architecture</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Four layers, one sovereign vault
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/40"
              >
                <div className="grid size-11 place-items-center rounded-lg border border-border bg-secondary/50 text-primary transition group-hover:border-primary/40">
                  <f.Icon className="size-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification honesty */}
      <section id="verify" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Real verification</p>
                <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
                  We check the source, not just the paperwork
                </h2>
                <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
                  When you upload a credential, Aegis resolves the issuing authority,
                  probes live verification links, validates document structure and
                  cross-references public records — producing a transparent, itemized
                  confidence score before anything touches the ledger.
                </p>
                <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground/80">
                  Some document types (passports, government IDs, banking) require a
                  licensed data provider for a fully authoritative match. Aegis runs
                  every open check it can and clearly marks which steps await a
                  connected provider — it never fabricates a result.
                </p>
              </div>
              <ul className="flex flex-col justify-center gap-3">
                {[
                  'Issuer domain resolution & liveness',
                  'Live verification-link probing',
                  'Structural & checksum validation',
                  'Validity-window / expiry enforcement',
                  'Public-record cross-referencing',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm"
                  >
                    <ShieldCheck className="size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight">
            Your identity should belong to you.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
            Spin up a sovereign digital ID in seconds. No email required to explore
            the vault.
          </p>
          <div className="mt-8 flex justify-center">
            <Button render={<Link href="/onboarding" />} nativeButton={false} size="lg">
              Create your identity <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p className="text-center text-xs text-muted-foreground/70 sm:text-right">
            Prototype. Cryptographic layers are simulated for demonstration; verification
            performs real network checks where possible.
          </p>
        </div>
      </footer>
    </div>
  )
}
