'use client'

import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import { MapPin } from 'lucide-react'
import type { Quest, QuestPoint } from '@/lib/quests'

setWorkerUrl('/maplibre-gl-worker.mjs')

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'openstreetmap-raster', type: 'raster', source: 'openstreetmap', minzoom: 0, maxzoom: 19 }],
}

interface QuestsMapProps {
  quests: Quest[]
  center: QuestPoint & { zoom: number }
  draftPoint: QuestPoint | null
  selectedId: string | null
  onSelect: (id: string) => void
  onMapClick: (point: QuestPoint) => void
}

export function QuestsMap({ quests, center, draftPoint, selectedId, onSelect, onMapClick }: QuestsMapProps) {
  return (
    <div className="relative h-[min(62vh,620px)] min-h-[360px] overflow-hidden rounded-xl border border-border/70 bg-secondary/20">
      <Map
        key={`${center.latitude}:${center.longitude}:${center.zoom}`}
        initialViewState={{ longitude: center.longitude, latitude: center.latitude, zoom: center.zoom }}
        mapStyle={BASEMAP_STYLE}
        onClick={(event) => onMapClick({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        {quests.map((quest) => (
          <Marker key={quest.id} latitude={Number(quest.latitude)} longitude={Number(quest.longitude)} anchor="bottom">
            <button
              type="button"
              aria-label={`Select quest: ${quest.title}`}
              aria-pressed={selectedId === quest.id}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(quest.id)
              }}
              className={`flex size-9 items-center justify-center rounded-full border-2 shadow-lg transition ${
                selectedId === quest.id
                  ? 'border-primary bg-primary text-primary-foreground scale-110'
                  : 'border-success bg-background text-success hover:scale-110'
              }`}
            >
              <MapPin className="size-4" aria-hidden="true" />
            </button>
          </Marker>
        ))}
        {draftPoint && (
          <Marker latitude={draftPoint.latitude} longitude={draftPoint.longitude} anchor="bottom">
            <div className="flex size-9 items-center justify-center rounded-full border-2 border-primary bg-primary/20 text-primary shadow-lg" aria-label="New quest location">
              <MapPin className="size-4" aria-hidden="true" />
            </div>
          </Marker>
        )}
      </Map>
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border/70 bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
        Click the map to set a quest pin or local area
      </div>
    </div>
  )
}
