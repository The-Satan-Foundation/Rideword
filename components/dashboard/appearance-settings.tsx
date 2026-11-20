'use client'

import { useState, type ChangeEvent } from 'react'
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Palette,
  RotateCcw,
  Type,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_APPEARANCE, useAppearance } from '@/lib/appearance'

const FONT_OPTIONS = ['Geist', 'Georgia', 'Arial', 'Trebuchet MS', 'Courier New']
const PALETTES = [
  { name: 'Ember', accent: '#d94b55' },
  { name: 'Tide', accent: '#49a5c7' },
  { name: 'Verdant', accent: '#55a879' },
  { name: 'Amethyst', accent: '#9b7be2' },
  { name: 'Gilded', accent: '#c69b4e' },
]
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']
const FONT_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.otf']

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this file.'))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

function hasExtension(fileName: string, extensions: string[]) {
  const normalized = fileName.toLowerCase()
  return extensions.some((extension) => normalized.endsWith(extension))
}

export function AppearanceSettings() {
  const { settings, updateAppearance, error } = useAppearance()
  const [saving, setSaving] = useState(false)

  const save = async (patch: Parameters<typeof updateAppearance>[0]) => {
    setSaving(true)
    try {
      await updateAppearance(patch)
    } catch {
      toast.error('Could not save these changes in this browser.')
    } finally {
      setSaving(false)
    }
  }

  const importImage = async (event: ChangeEvent<HTMLInputElement>, kind: 'background' | 'avatar') => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const validType = IMAGE_TYPES.includes(file.type) || hasExtension(file.name, IMAGE_EXTENSIONS)
    if (!validType) {
      toast.error('Choose a PNG, JPG, WebP, GIF, or AVIF image.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Images must be 8 MB or smaller.')
      return
    }

    setSaving(true)
    try {
      const dataUrl = await fileAsDataUrl(file)
      await updateAppearance(
        kind === 'background'
          ? { backgroundDataUrl: dataUrl, backgroundFileName: file.name }
          : { avatarDataUrl: dataUrl, avatarFileName: file.name },
      )
    } catch {
      toast.error('Could not save this image in this browser.')
    } finally {
      setSaving(false)
    }
  }

  const importFont = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (!hasExtension(file.name, FONT_EXTENSIONS)) {
      toast.error('Choose a WOFF, WOFF2, TTF, or OTF font file.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Font files must be 4 MB or smaller.')
      return
    }

    setSaving(true)
    try {
      const dataUrl = await fileAsDataUrl(file)
      await updateAppearance({ fontDataUrl: dataUrl, fontFileName: file.name, fontFamily: 'Imported' })
    } catch {
      toast.error('Could not save this font in this browser.')
    } finally {
      setSaving(false)
    }
  }

  const resetAppearance = async () => {
    setSaving(true)
    try {
      await updateAppearance({ ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors } })
      toast.success('Appearance restored to defaults.')
    } catch {
      toast.error('Could not restore the default appearance.')
    } finally {
      setSaving(false)
    }
  }

  const fontPreview = settings.fontFamily === 'Imported'
    ? 'GrimoirImported'
    : settings.fontFamily === 'Geist'
      ? 'var(--font-geist-sans)'
      : JSON.stringify(settings.fontFamily)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Personalize your vault</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Appearance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Shape the Grimoir interface with your own imagery, type, and color palette.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground sm:self-auto">
          {saving ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5 text-success" aria-hidden="true" />}
          {saving ? 'Saving locally' : 'Saved on this device'}
        </div>
      </header>

      {error && (
        <p role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          Local appearance storage could not be read. Your browser may be blocking site storage.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <ImagePlus aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Images</CardTitle>
                  <CardDescription className="mt-1">Add a personal mark and a living backdrop.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  {settings.avatarDataUrl ? (
                    <img src={settings.avatarDataUrl} alt="Current user icon" className="size-12 rounded-full border border-border object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-full border border-border bg-secondary text-muted-foreground">
                      <UserRound aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">User icon</p>
                    <p className="truncate text-xs text-muted-foreground">{settings.avatarFileName ?? 'No image selected'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Label htmlFor="avatar-upload" className="sr-only">Import user icon</Label>
                  <Input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="h-9 min-w-0 flex-1 cursor-pointer text-xs file:mr-2 file:h-6 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:text-xs file:font-medium" onChange={(event) => void importImage(event, 'avatar')} />
                  {settings.avatarDataUrl && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void save({ avatarDataUrl: null, avatarFileName: null })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/35 p-4">
                <div className="flex items-center gap-3">
                  <div
                    role="img"
                    aria-label={settings.backgroundDataUrl ? 'Current background preview' : 'No background selected'}
                    className="size-12 shrink-0 rounded-lg border border-border bg-grid bg-secondary bg-cover bg-center"
                    style={settings.backgroundDataUrl ? { backgroundImage: `linear-gradient(rgba(9, 12, 18, .28), rgba(9, 12, 18, .28)), url(${JSON.stringify(settings.backgroundDataUrl)})` } : undefined}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Background</p>
                    <p className="truncate text-xs text-muted-foreground">{settings.backgroundFileName ?? 'Image or animated GIF'}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Label htmlFor="background-upload" className="sr-only">Import background image</Label>
                  <Input id="background-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="h-9 min-w-0 flex-1 cursor-pointer text-xs file:mr-2 file:h-6 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:text-xs file:font-medium" onChange={(event) => void importImage(event, 'background')} />
                  {settings.backgroundDataUrl && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void save({ backgroundDataUrl: null, backgroundFileName: null })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">PNG, JPG, WebP, GIF, and AVIF · 8 MB max · Stored only in this browser.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Type aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Typography</CardTitle>
                  <CardDescription className="mt-1">Choose a system font or import your own.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="font-family">Interface font</Label>
                <select
                  id="font-family"
                  value={settings.fontFamily}
                  onChange={(event) => void save({ fontFamily: event.currentTarget.value })}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font === 'Geist' ? 'Geist (default)' : font}</option>)}
                  <option value="Imported" disabled={!settings.fontDataUrl}>Imported font{settings.fontFileName ? ` · ${settings.fontFileName}` : ''}</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Label htmlFor="font-upload" className="sr-only">Import custom font file</Label>
                <Input id="font-upload" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" className="h-9 min-w-0 flex-1 cursor-pointer text-xs file:mr-2 file:h-6 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:text-xs file:font-medium" onChange={(event) => void importFont(event)} />
                <span className="truncate text-xs text-muted-foreground">{settings.fontFileName ?? 'WOFF, WOFF2, TTF, or OTF · 4 MB max'}</span>
                {settings.fontDataUrl && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void save({ fontDataUrl: null, fontFileName: null, fontFamily: 'Geist' })}>
                    Remove font
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Palette aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Color palette</CardTitle>
                  <CardDescription className="mt-1">Tune the text, borders, and interface accent.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2" aria-label="Accent color presets">
                {PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => void save({ colors: { ...settings.colors, accent: palette.accent } })}
                    aria-label={`${palette.name} accent preset`}
                    aria-pressed={settings.colors.accent.toLowerCase() === palette.accent.toLowerCase()}
                    className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground aria-pressed:border-foreground/40 aria-pressed:text-foreground"
                  >
                    <span className="size-3 rounded-full" style={{ backgroundColor: palette.accent }} />
                    {palette.name}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {([
                  ['text', 'Font color'],
                  ['border', 'Border color'],
                  ['accent', 'Accent color'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="grid gap-2">
                    <Label htmlFor={`color-${key}`}>{label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`color-${key}`}
                        type="color"
                        value={settings.colors[key]}
                        onChange={(event) => void save({ colors: { ...settings.colors, [key]: event.currentTarget.value } })}
                        className="h-10 w-14 cursor-pointer p-1"
                        aria-label={label}
                      />
                      <span className="font-mono text-xs uppercase text-muted-foreground">{settings.colors[key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>See your palette and type in context.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative isolate overflow-hidden rounded-xl border border-border bg-card p-5">
                {settings.backgroundDataUrl && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-cover bg-center opacity-35"
                    style={{ backgroundImage: `url(${JSON.stringify(settings.backgroundDataUrl)})` }}
                  />
                )}
                <div className="flex items-center gap-3">
                  {settings.avatarDataUrl ? (
                    <img src={settings.avatarDataUrl} alt="" className="size-10 rounded-full border border-border object-cover" />
                  ) : (
                    <span className="grid size-10 place-items-center rounded-full border border-border bg-secondary text-muted-foreground"><UserRound aria-hidden="true" /></span>
                  )}
                  <div>
                    <p className="text-sm font-medium">Your vault</p>
                    <p className="text-xs text-muted-foreground">Appearance preview</p>
                  </div>
                </div>
                <p className="mt-6 text-xl font-semibold tracking-tight" style={{ fontFamily: fontPreview }}>
                  Own your signal.
                </p>
                <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: fontPreview }}>
                  A clearer interface, shaped around you.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    Accent
                  </span>
                  <span className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground" style={{ borderColor: settings.colors.border }}>
                    Border
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Your uploaded files and preferences stay in IndexedDB on this device. They are not uploaded to a server.</p>
              <Button type="button" variant="outline" className="mt-5 w-full" onClick={() => void resetAppearance()} disabled={saving}>
                <RotateCcw data-icon="inline-start" />
                Reset appearance
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
