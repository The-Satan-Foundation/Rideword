'use client'

import { useState } from 'react'
import { Radio, Satellite, Signal, Wifi, WifiOff } from 'lucide-react'
import { useAegis } from '@/lib/store'
import type { MeshNode } from '@/lib/types'
import { CONSORTIUM_ISSUERS } from '@/lib/issuers'
import { MeshNetwork } from '@/components/mesh-network'
import { Card } from '@/components/ui/card'

const TRANSPORT_META: Record<string, { Icon: typeof Radio; label: string }> = {
  internet: { Icon: Wifi, label: 'Internet' },
  lora_mesh: { Icon: Radio, label: 'LoRa mesh' },
  satellite: { Icon: Satellite, label: 'Satellite' },
}

export default function NetworkPage() {
  const { nodes } = useAegis()
  const [selected, setSelected] = useState<MeshNode | null>(null)
  const active = selected ?? nodes.find((n) => n.isSelf) ?? nodes[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mesh network</h1>
        <p className="text-sm text-muted-foreground">
          Your identity replicates across a peer-to-peer mesh. It stays verifiable even with no
          internet — nodes gossip over long-range LoRa radio.
        </p>
      </div>

      {/* Offline-first banner */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg border border-success/30 bg-success/10 text-success">
            <WifiOff className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold">Internet-independent</p>
            <p className="text-xs text-muted-foreground">
              LoRa radio carries ledger gossip up to ~15 km per hop. The internet is just one
              optional transport.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {Object.values(TRANSPORT_META).map(({ Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground"
            >
              <Icon className="size-3.5" /> {label}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Mesh visualization */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Live topology</h2>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Signal className="size-3.5 text-success" />
              {nodes.filter((n) => n.status === 'online').length}/{nodes.length} online
            </span>
          </div>
          <div className="mx-auto mt-4 max-w-md">
            <MeshNetwork
              nodes={nodes}
              showLabels
              onSelect={setSelected}
              selectedId={active?.id}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <LegendDot color="var(--color-success)" label="Online" />
            <LegendDot color="var(--color-primary)" label="Syncing" />
            <LegendDot color="var(--color-accent)" label="Degraded" />
          </div>
        </Card>

        {/* Selected node detail */}
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-sm font-semibold">Node inspector</h2>
          {active && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-mono text-sm text-primary">{active.label}</p>
                <p className="text-xs text-muted-foreground">{active.region}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <Metric label="Status" value={active.status} />
                <Metric label="Latency" value={active.isSelf ? 'local' : `${active.latencyMs}ms`} />
                <Metric label="Peers" value={`${active.peers}`} />
                <Metric label="Shards" value={`${active.replicatedShards}`} />
              </dl>
              <p className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
                {active.isSelf
                  ? 'This device holds a full replica of your identity ledger. It can attest credentials offline and re-sync when any peer comes into range.'
                  : 'Peer node replicating encrypted shards of the consortium ledger. Holds no plaintext credential data.'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Consortium directory */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Consortium issuers</h2>
            <p className="text-xs text-muted-foreground">
              Institutions that have opted in to vouch for credentials. This list only grows when an
              institution joins — never by scraping.
            </p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
            {CONSORTIUM_ISSUERS.length} members
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CONSORTIUM_ISSUERS.map((m) => (
            <div key={m.id} className="rounded-lg border border-border/60 bg-secondary/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{m.domain}</p>
                </div>
                <span className="size-2 shrink-0 rounded-full bg-success" style={{ animation: 'pulse-node 2s ease-in-out infinite' }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.transports.map((t) => {
                  const meta = TRANSPORT_META[t]
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      <meta.Icon className="size-3" /> {meta.label}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Are you an institution? Publishing your verification endpoint and signing key opts you
            in — every held credential from your organization verifies instantly.
          </p>
        </div>
      </Card>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize">{value}</dd>
    </div>
  )
}
