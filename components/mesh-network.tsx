'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { MeshNode } from '@/lib/types'

interface Edge {
  a: MeshNode
  b: MeshNode
  self: boolean
}

const STATUS_COLOR: Record<MeshNode['status'], string> = {
  online: 'var(--color-success)',
  syncing: 'var(--color-primary)',
  degraded: 'var(--color-accent)',
}

export function MeshNetwork({
  nodes,
  className,
  showLabels = false,
  onSelect,
  selectedId,
}: {
  nodes: MeshNode[]
  className?: string
  showLabels?: boolean
  onSelect?: (node: MeshNode) => void
  selectedId?: string
}) {
  const edges = useMemo<Edge[]>(() => {
    if (!nodes.length) return []
    const self = nodes.find((n) => n.isSelf)
    const peers = nodes.filter((n) => !n.isSelf)
    const result: Edge[] = []
    // Hub-and-spoke from the self node.
    if (self) {
      for (const p of peers) result.push({ a: self, b: p, self: true })
    }
    // Ring between adjacent peers for a mesh feel.
    for (let i = 0; i < peers.length; i++) {
      const a = peers[i]
      const b = peers[(i + 1) % peers.length]
      result.push({ a, b, self: false })
    }
    return result
  }, [nodes])

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.a.x}
            y1={e.a.y}
            x2={e.b.x}
            y2={e.b.y}
            stroke={e.self ? 'var(--color-primary)' : 'var(--color-border)'}
            strokeWidth={e.self ? 0.35 : 0.22}
            strokeOpacity={e.self ? 0.5 : 0.6}
            strokeDasharray={e.self ? '2 2' : undefined}
            style={
              e.self
                ? { animation: 'dash-flow 1.6s linear infinite' }
                : undefined
            }
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {nodes.map((node, i) => {
        const color = STATUS_COLOR[node.status]
        const size = node.isSelf ? 18 : 11
        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <button
              type="button"
              onClick={() => onSelect?.(node)}
              className={cn(
                'group relative grid place-items-center rounded-full transition',
                onSelect ? 'cursor-pointer' : 'cursor-default',
              )}
              style={{ width: size + 14, height: size + 14 }}
              aria-label={`${node.label} — ${node.status}`}
            >
              {node.isSelf && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: `0 0 0 1px color-mix(in oklch, ${color} 60%, transparent)`,
                  }}
                />
              )}
              <span
                className="rounded-full ring-2 ring-background"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  boxShadow: `0 0 14px 0 color-mix(in oklch, ${color} 70%, transparent)`,
                  animation: node.isSelf
                    ? 'pulse-node 2.4s ease-in-out infinite'
                    : node.status === 'syncing'
                      ? 'pulse-node 3s ease-in-out infinite'
                      : undefined,
                  outline:
                    selectedId === node.id
                      ? `2px solid var(--color-foreground)`
                      : undefined,
                  outlineOffset: 2,
                }}
              />
              {showLabels && (
                <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  {node.label}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
