'use client'

import { useState } from 'react'
import { Bot, Check, Copy, Fingerprint, LockKeyhole, ShieldAlert, ShieldCheck, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAegis } from '@/lib/store'

const demoRequests = [
  { name: 'Dr. Maya Chen', credential: 'Emergency physician · verified', topic: 'Does the patient have a penicillin allergy?' },
  { name: 'Jon Bell', credential: 'Water treatment operator · verified', topic: 'Does the patient have a medication allergy?' },
]

export default function CompanionPage() {
  const { identity, requestCompanionAccess } = useAegis()
  const companion = identity?.companion
  const [requesterName, setRequesterName] = useState(demoRequests[0].name)
  const [requesterCredential, setRequesterCredential] = useState(demoRequests[0].credential)
  const [requestedTopic, setRequestedTopic] = useState(demoRequests[0].topic)
  const [lastDecision, setLastDecision] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!identity || !companion) return <div className="p-8 text-muted-foreground">Create an Aegis identity to pair a companion.</div>
  const pairedCompanion = companion

  async function runHandshake() {
    const event = await requestCompanionAccess({ requesterName, requesterCredential, requestedTopic })
    setLastDecision(event.decision === 'resolved' ? 'Resolved: minimum necessary response released.' : 'Denied: credential scope does not match this request.')
  }

  async function copySeed() {
    await navigator.clipboard.writeText(pairedCompanion.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Paired intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your Aegis companion</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A deterministic identity-bound sentinel watches access attempts and performs credential-scoped handshakes between Aegis units. It never answers beyond the requester&apos;s verified role.</p>
        </div>
        <Badge className="gap-2 border-success/30 bg-success/10 text-success"><span className="size-1.5 rounded-full bg-success" /> Paired and monitoring</Badge>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-primary/20 bg-primary/[0.04]">
          <CardContent className="p-0">
            <div className="flex items-center gap-5 border-b border-border/60 p-6">
              <div className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_40px_-12px_hsl(var(--primary))]"><Bot className="size-8" /></div>
              <div><h2 className="text-xl font-semibold">{companion.name}</h2><p className="mt-1 font-mono text-xs text-muted-foreground">{pairedCompanion.id}</p></div>
              <div className="ml-auto hidden text-right sm:block"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Status</p><p className="mt-1 text-sm font-medium text-success">Online on mesh</p></div>
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4"><Fingerprint className="size-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">Bound to DID</p><p className="mt-1 truncate font-mono text-xs">{identity.did}</p></div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4"><Wifi className="size-4 text-success" /><p className="mt-3 text-xs text-muted-foreground">Handshake transport</p><p className="mt-1 text-sm">LoRa mesh + internet</p></div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4"><LockKeyhole className="size-4 text-accent" /><p className="mt-3 text-xs text-muted-foreground">Policy</p><p className="mt-1 text-sm">Least privilege</p></div>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 px-6 py-4"><span className="font-mono text-[10px] text-muted-foreground">INSTANCE ID · {pairedCompanion.id}</span><Button variant="ghost" size="sm" onClick={copySeed}>{copied ? <Check className="mr-2 size-3.5" /> : <Copy className="mr-2 size-3.5" />}{copied ? 'Copied' : 'Copy ID'}</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-success" /> Credential-scoped handshake</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>The blockchain identity seeds this companion&apos;s instance. A requester must present a matching credential scope before a response can resolve.</p>
            <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-xs leading-5"><strong className="text-success">Example:</strong> a verified physician may ask about medication allergies. A water-treatment credential cannot.</div>
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-xs">Responses are minimum-necessary, logged, hashed, and replicated over the mesh. Raw health data never enters the public ledger.</div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle className="text-base">Test a digital handshake</CardTitle><p className="text-sm text-muted-foreground">This simulator demonstrates how the companion evaluates a request before resolving it.</p></CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-2"><Label>Requester</Label><Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Credential scope</Label><Input value={requesterCredential} onChange={(e) => setRequesterCredential(e.target.value)} /></div>
          <div className="space-y-2"><Label>Requested topic</Label><Input value={requestedTopic} onChange={(e) => setRequestedTopic(e.target.value)} /></div>
          <Button onClick={runHandshake}>Run handshake</Button>
          {lastDecision && <div className={`lg:col-span-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${lastDecision.startsWith('Resolved') ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}><ShieldAlert className="size-4" />{lastDecision}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Access monitor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {companion.accessLog.length === 0 ? <p className="text-sm text-muted-foreground">No access attempts yet. Every request will appear here.</p> : companion.accessLog.map((event) => <div key={event.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3 text-sm"><span className={`size-2 rounded-full ${event.decision === 'resolved' ? 'bg-success' : 'bg-destructive'}`} /><span className="font-medium">{event.requesterName}</span><span className="text-muted-foreground">asked: {event.requestedTopic}</span><span className="ml-auto font-mono text-[10px] text-muted-foreground">{event.handshakeHash.slice(0, 16)}…</span></div>)}
        </CardContent>
      </Card>
    </main>
  )
}
