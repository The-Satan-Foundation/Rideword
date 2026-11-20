'use client'

import { useState, type FormEvent } from 'react'
import { MapPin, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { QuestPayload, QuestPoint } from '@/lib/quests'

interface QuestFormProps {
  point: QuestPoint | null
  onPointChange: (point: QuestPoint | null) => void
  onCancel: () => void
  onSubmit: (payload: QuestPayload) => Promise<void>
}

export function QuestForm({ point, onPointChange, onCancel, onSubmit }: QuestFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [scope, setScope] = useState<'local' | 'global'>('local')
  const [radiusKm, setRadiusKm] = useState(25)
  const [credentialMinimum, setCredentialMinimum] = useState('aegis_holder')
  const [rewardAmount, setRewardAmount] = useState('')
  const [rewardCurrency, setRewardCurrency] = useState<'USD' | 'SOL'>('USD')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!point) {
      setError('Set the geopin by clicking the map or entering both coordinates.')
      return
    }
    const amount = Number(rewardAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a bounty amount greater than zero.')
      return
    }
    if (rewardCurrency === 'USD' && Math.round(amount * 100) !== amount * 100) {
      setError('USD bounty amounts support up to two decimal places.')
      return
    }

    setBusy(true)
    try {
      await onSubmit({
        title,
        description,
        locationLabel,
        latitude: point.latitude,
        longitude: point.longitude,
        scope,
        radiusKm: scope === 'local' ? radiusKm : null,
        credentialMinimum: credentialMinimum as QuestPayload['credentialMinimum'],
        rewardAmount: amount,
        rewardCurrency,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish this quest.')
    } finally {
      setBusy(false)
    }
  }

  function updateCoordinate(axis: 'latitude' | 'longitude', value: string) {
    if (value.trim() === '') {
      onPointChange(null)
      return
    }
    const number = Number(value)
    if (!Number.isFinite(number)) return
    onPointChange({
      latitude: axis === 'latitude' ? number : point?.latitude ?? 0,
      longitude: axis === 'longitude' ? number : point?.longitude ?? 0,
    })
  }

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Post a field quest</CardTitle>
            <CardDescription className="mt-1">Set the pin, response requirements, and a bounty offer. No payment is processed here.</CardDescription>
          </div>
          <Radio className="size-5 text-primary" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="quest-title">Quest title</FieldLabel>
              <Input id="quest-title" required minLength={8} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Inspect filter unit at treatment plant #3" />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="quest-description">What needs to be done?</FieldLabel>
              <Textarea id="quest-description" required minLength={20} maxLength={2400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue, evidence available, and the requested action." className="min-h-24" />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="quest-location">Location label</FieldLabel>
              <Input id="quest-location" required minLength={2} maxLength={180} value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Water Treatment Plant #3, Austin" />
            </Field>
            <FieldSet>
              <FieldLegend>Map reach</FieldLegend>
              <ToggleGroup
                aria-label="Quest visibility"
                value={[scope]}
                onValueChange={(values) => {
                  const next = values[0]
                  if (next === 'local' || next === 'global') setScope(next)
                }}
              >
                <ToggleGroupItem value="local">Local</ToggleGroupItem>
                <ToggleGroupItem value="global">Global</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>The nearby view filters local quests by this radius. Quest records remain publicly readable; global quests appear in every map view.</FieldDescription>
            </FieldSet>
            {scope === 'local' && (
              <Field>
                <FieldLabel htmlFor="quest-radius">Local response radius</FieldLabel>
                <NativeSelect id="quest-radius" className="w-full" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
                  {[5, 10, 25, 50, 100, 250, 500, 1000].map((radius) => <NativeSelectOption key={radius} value={radius}>{radius} km</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="quest-credential">Minimum credential to respond</FieldLabel>
              <Select value={credentialMinimum} onValueChange={(value) => { if (value) setCredentialMinimum(value) }}>
                <SelectTrigger id="quest-credential" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="aegis_holder">Any Aegis holder</SelectItem>
                    <SelectItem value="water_treatment">Water treatment operator</SelectItem>
                    <SelectItem value="medical_professional">Medical professional</SelectItem>
                    <SelectItem value="licensed_engineer">Licensed engineer</SelectItem>
                    <SelectItem value="field_technician">Field technician</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>This records the requested minimum; credential enforcement for claiming quests is not part of this release.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="quest-reward">Bounty offer</FieldLabel>
              <div className="flex gap-2">
                <Input id="quest-reward" required type="number" min="0.000000001" step={rewardCurrency === 'USD' ? '0.01' : '0.000000001'} inputMode="decimal" value={rewardAmount} onChange={(event) => setRewardAmount(event.target.value)} placeholder="0.00" />
                <NativeSelect aria-label="Bounty currency" className="w-24 shrink-0" value={rewardCurrency} onChange={(event) => setRewardCurrency(event.target.value as 'USD' | 'SOL')}>
                  <NativeSelectOption value="USD">USD</NativeSelectOption>
                  <NativeSelectOption value="SOL">SOL</NativeSelectOption>
                </NativeSelect>
              </div>
              <FieldDescription>Display only. No wallet transfer, escrow, or payment processing.</FieldDescription>
            </Field>
            <FieldSet className="md:col-span-2">
              <FieldLegend variant="label">Geopin coordinates</FieldLegend>
              <FieldGroup className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor="quest-latitude">Latitude</FieldLabel>
                  <Input id="quest-latitude" type="number" min="-90" max="90" step="any" inputMode="decimal" value={point?.latitude ?? ''} onChange={(event) => updateCoordinate('latitude', event.target.value)} placeholder="Latitude" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="quest-longitude">Longitude</FieldLabel>
                  <Input id="quest-longitude" type="number" min="-180" max="180" step="any" inputMode="decimal" value={point?.longitude ?? ''} onChange={(event) => updateCoordinate('longitude', event.target.value)} placeholder="Longitude" />
                </Field>
                <FieldDescription className="flex items-center gap-2 sm:pb-2"><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />Click the map or enter both coordinates.</FieldDescription>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish quest'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
