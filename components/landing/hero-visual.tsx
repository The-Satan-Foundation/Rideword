'use client'

import { useMemo } from 'react'
import { MeshNetwork } from '@/components/mesh-network'
import type { MeshNode } from '@/lib/types'

const REGIONS = ['REY', 'ZRH', 'SIN', 'YYZ', 'CPT', 'GRU', 'NRT', 'FRA', 'SYD', 'DXB', 'BOM', 'OSL', 'ICN']

function demoNodes(): MeshNode[] {
  const count = 13
  const nodes: MeshNode[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const radius = 32 + ((i * 7) % 11)
    const roll = (i * 41) % 100
    nodes.push({
      id: `demo-${i}`,
      label: `aegis-${REGIONS[i % REGIONS.length].toLowerCase()}`,
      region: REGIONS[i % REGIONS.length],
      status: roll > 86 ? 'degraded' : roll > 72 ? 'syncing' : 'online',
      latencyMs: 12 + (roll % 50),
      peers: 4 + (roll % 8),
      replicatedShards: 3 + (roll % 6),
      x: Math.round(50 + Math.cos(angle) * radius),
      y: Math.round(50 + Math.sin(angle) * radius),
    })
  }
  nodes.push({
    id: 'demo-self',
    label: 'your identity',
    region: 'edge',
    status: 'online',
    latencyMs: 0,
    peers: 6,
    replicatedShards: 9,
    isSelf: true,
    x: 50,
    y: 50,
  })
  return nodes
}

export function HeroVisual() {
  const nodes = useMemo(demoNodes, [])
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/10 blur-3xl" />
      <MeshNetwork nodes={nodes} showLabels />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          self-sovereign core
        </p>
      </div>
    </div>
  )
}
