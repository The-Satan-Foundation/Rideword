'use client'

import { FormEvent, useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, CheckCircle2, Eye, LockKeyhole, Radio, ShieldCheck, UserCheck, Waves } from 'lucide-react'
import { useAegis } from '@/lib/store'
import type { IncidentSeverity, IncidentStatus, SensorReading } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const statusMeta: Record<IncidentStatus, { label: string; className: string }> = {
  reported: { label: 'Reported', className: 'border-accent/40 bg-accent/10 text-accent' },
  independently_verified: { label: 'Independently verified', className: 'border-success/40 bg-success/10 text-success' },
  maintenance: { label: 'Maintenance required', className: 'border-primary/40 bg-primary/10 text-primary' },
  resolved: { label: 'Resolved', className: 'border-border bg-secondary text-muted-foreground' },
}

const severityMeta: Record<IncidentSeverity, string> = {
  low: 'border-border text-muted-foreground',
  medium: 'border-accent/40 text-accent',
  high: 'border-orange-400/40 text-orange-300',
  critical: 'border-destructive/40 text-destructive',
}

export default function IncidentsPage() {
  const { incidents, credentials, identity, reportIncident, verifyIncident } = useAegis()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [facility, setFacility] = useState('Water Treatment Plant #3')
  const [asset, setAsset] = useState('Intake filtration system')
  const [title, setTitle] = useState('Filter performance outside specification')
  const [description, setDescription] = useState('')
  const [ph, setPh] = useState('6.1')
  const [salinity, setSalinity] = useState('0.48')
  const [severity, setSeverity] = useState<IncidentSeverity>('high')
  const [verifyNote, setVerifyNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const waterCredential = useMemo(
    () => credentials.find((c) => c.status === 'verified' && c.type === 'professional_license' && /water|treatment|operator/i.test(`${c.title} ${c.issuer}`)),
    [credentials],
  )
  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0]

  async function submitReport(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    try {
      const readings: SensorReading[] = [
        { metric: 'pH', value: ph, unit: 'pH', observedAt: new Date().toISOString(), sourceLabel: 'Aegis drone sensor array', hash: `sha256:${ph.replace('.', '')}…` },
        { metric: 'Salinity', value: salinity, unit: 'ppt', observedAt: new Date().toISOString(), sourceLabel: 'Aegis drone sensor array', hash: `sha256:${salinity.replace('.', '')}…` },
      ]
      const incident = await reportIncident({ title, facility, asset, description, severity, readings })
      setSelectedId(incident.id)
      setShowReport(false)
      setMessage('Incident published to the public Aegis feed and replicated to nearby mesh peers.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish incident.')
    }
  }

  async function submitVerification(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setMessage(null)
    try {
      await verifyIncident({ incidentId: selected.id, note: verifyNote, status: 'independently_verified' })
      setVerifyNote('')
      setMessage('Independent verification added. The incident status is now visible to every Aegis holder.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add verification.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-primary"><Radio className="size-3.5" /> Live field feed</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Infrastructure incidents</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Sensor-backed maintenance reports shared across the Aegis mesh. Everyone can see verified evidence; only credentialed specialists can write or attest.</p>
        </div>
        <Button onClick={() => setShowReport((value) => !value)} disabled={!waterCredential}>
          <AlertTriangle className="mr-2 size-4" /> Report field issue
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TrustRule icon={Eye} title="Public read access" body="Any Aegis holder can inspect the feed, evidence, and audit trail." />
        <TrustRule icon={UserCheck} title="Credentialed writes" body="Reports and independent checks require a verified water-treatment credential." />
        <TrustRule icon={Radio} title="Mesh replicated" body="Updates gossip over LoRa peers when internet service is unavailable." />
      </div>

      {message && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}

      {showReport && <Card className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Publish a sensor-backed report</h2><p className="mt-1 text-xs text-muted-foreground">Your verified credential and evidence hash will be permanently attached to this attestation.</p></div><ShieldCheck className="size-5 text-success" /></div>
        <form onSubmit={submitReport} className="grid gap-4 md:grid-cols-2">
          <Field label="Incident title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Facility"><Input value={facility} onChange={(e) => setFacility(e.target.value)} /></Field>
          <Field label="Asset / system"><Input value={asset} onChange={(e) => setAsset(e.target.value)} /></Field>
          <Field label="Severity"><select value={severity} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as IncidentSeverity)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
          <Field label="pH reading"><Input inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} /></Field>
          <Field label="Salinity (ppt)"><Input inputMode="decimal" value={salinity} onChange={(e) => setSalinity(e.target.value)} /></Field>
          <Field label="Operator note" className="md:col-span-2"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what the sensor array detected and the recommended action." /></Field>
          <div className="flex items-center justify-between gap-3 md:col-span-2"><p className="text-xs text-muted-foreground">Publishing as {identity?.displayName} · {waterCredential?.title}</p><Button type="submit">Publish to mesh</Button></div>
        </form>
      </Card>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><h2 className="font-semibold">Public incident ledger</h2><p className="text-xs text-muted-foreground">{incidents.length} shared {incidents.length === 1 ? 'incident' : 'incidents'} · live mesh sync</p></div><Badge variant="outline" className="gap-1.5 border-success/30 text-success"><span className="size-1.5 rounded-full bg-success" /> LIVE</Badge></div>
          {incidents.length === 0 ? <div className="px-5 py-16 text-center"><Waves className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No incidents in this local replica</p><p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">When a credentialed specialist reports a problem, it will appear here for every Aegis holder in range.</p></div> : <div className="divide-y divide-border/60">{incidents.map((incident) => <button key={incident.id} onClick={() => setSelectedId(incident.id)} className={`w-full p-5 text-left transition hover:bg-secondary/30 ${selected?.id === incident.id ? 'bg-primary/5' : ''}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-primary">{incident.id}</span><Badge variant="outline" className={severityMeta[incident.severity]}>{incident.severity}</Badge></div><h3 className="mt-2 font-medium">{incident.title}</h3><p className="mt-1 text-sm text-muted-foreground">{incident.facility} · {incident.asset}</p></div><Badge variant="outline" className={statusMeta[incident.status].className}>{statusMeta[incident.status].label}</Badge></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>Reported by <strong className="text-foreground">{incident.reporterName}</strong></span><span>{incident.attestations.length} attestation{incident.attestations.length === 1 ? '' : 's'}</span><span>{incident.readings.length} sensor readings</span></div></button>)}</div>}
        </Card>

        <Card className="p-5">
          {!selected ? <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><LockKeyhole className="size-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">Select an incident</p><p className="mt-1 text-xs text-muted-foreground">Evidence and attestations are visible to every Aegis holder.</p></div> : <div><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Evidence packet</p><h2 className="mt-1 font-semibold">{selected.facility}</h2></div><CheckCircle2 className="size-5 text-success" /></div><p className="mt-3 text-sm text-muted-foreground">{selected.description}</p><Separator className="my-4" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sensor readings</h3><div className="mt-3 grid grid-cols-2 gap-2">{selected.readings.map((reading) => <div key={reading.metric} className="rounded-lg border border-border/60 bg-secondary/20 p-3"><p className="text-xs text-muted-foreground">{reading.metric}</p><p className="mt-1 font-mono text-lg">{reading.value} <span className="text-xs text-muted-foreground">{reading.unit}</span></p><p className="mt-1 font-mono text-[9px] text-muted-foreground">{reading.sourceLabel}</p></div>)}</div><Separator className="my-4" /><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attestation chain</h3><div className="mt-3 space-y-3">{selected.attestations.map((attestation) => <div key={attestation.id} className="rounded-lg border border-border/60 p-3"><div className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-success" /><p className="text-xs font-medium">{attestation.actorName}</p><Badge variant="outline" className="ml-auto text-[10px]">{attestation.kind === 'report' ? 'Reporter' : 'Independent verifier'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{attestation.credentialTitle}</p><p className="mt-2 text-xs">{attestation.note}</p><p className="mt-2 truncate font-mono text-[9px] text-muted-foreground">evidence · {attestation.evidenceHash}</p></div>)}</div>{waterCredential && selected.attestations.every((a) => a.actorDid !== identity?.did) && <form onSubmit={submitVerification} className="mt-5 border-t border-border/60 pt-4"><Label htmlFor="verify-note">Independent field verification</Label><textarea id="verify-note" required value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} className="mt-2" placeholder="Describe what you inspected on site." /><Button type="submit" size="sm" className="mt-3 w-full"><ShieldCheck className="mr-2 size-4" /> Co-sign as verified specialist</Button></form>}</div>}
        </Card>
      </div>
    </div>
  )
}

function TrustRule({ icon: Icon, title, body }: { icon: typeof Eye; title: string; body: string }) {
  return <Card className="p-4"><Icon className="size-4 text-primary" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></Card>
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-2 block text-xs">{label}</Label>{children}</div>
}
