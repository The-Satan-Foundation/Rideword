'use client'

import { useEffect } from 'react'
import useSWR from 'swr'

const DATABASE_NAME = 'grimoir-appearance'
const STORE_NAME = 'settings'
const SETTINGS_KEY = 'current'
const SWR_KEY = 'grimoir-appearance-settings'

export interface AppearanceSettings {
  backgroundDataUrl: string | null
  backgroundFileName: string | null
  avatarDataUrl: string | null
  avatarFileName: string | null
  fontDataUrl: string | null
  fontFileName: string | null
  fontFamily: string
  colors: {
    text: string
    border: string
    accent: string
  }
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  backgroundDataUrl: null,
  backgroundFileName: null,
  avatarDataUrl: null,
  avatarFileName: null,
  fontDataUrl: null,
  fontFileName: null,
  fontFamily: 'Geist',
  colors: {
    text: '#e7e9ee',
    border: '#343b48',
    accent: '#d94b55',
  },
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support local appearance storage.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local appearance storage.'))
  })
}

async function readAppearance(): Promise<AppearanceSettings> {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE

  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(SETTINGS_KEY)
    request.onsuccess = () => {
      const stored = request.result as Partial<AppearanceSettings> | undefined
      resolve(
        stored
          ? {
              ...DEFAULT_APPEARANCE,
              ...stored,
              colors: { ...DEFAULT_APPEARANCE.colors, ...stored.colors },
            }
          : DEFAULT_APPEARANCE,
      )
      database.close()
    }
    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error('Could not read local appearance settings.'))
    }
  })
}

async function writeAppearance(settings: AppearanceSettings): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(settings, SETTINGS_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Could not save local appearance settings.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Saving local appearance settings was interrupted.'))
    }
  })
}

export function useAppearance() {
  const { data, error, isLoading, mutate } = useSWR<AppearanceSettings>(SWR_KEY, readAppearance, {
    fallbackData: DEFAULT_APPEARANCE,
    revalidateOnFocus: false,
  })

  const settings = data ?? DEFAULT_APPEARANCE

  const updateAppearance = async (patch: Partial<AppearanceSettings>) => {
    await mutate(
      async (current) => {
        const currentSettings = current ?? DEFAULT_APPEARANCE
        const next: AppearanceSettings = {
          ...currentSettings,
          ...patch,
          colors: patch.colors ? { ...currentSettings.colors, ...patch.colors } : currentSettings.colors,
        }
        await writeAppearance(next)
        return next
      },
      { revalidate: false },
    )
  }

  return { settings, updateAppearance, error, isLoading }
}

function contrastingColor(hexColor: string): string {
  const value = Number.parseInt(hexColor.replace('#', ''), 16)
  if (!Number.isFinite(value)) return '#101116'

  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  return luminance > 0.45 ? '#111318' : '#f7f7f8'
}

export function AppearanceSync() {
  const { settings } = useAppearance()

  useEffect(() => {
    const root = document.documentElement
    const { text, border, accent } = settings.colors
    const accentForeground = contrastingColor(accent)

    root.style.setProperty('--foreground', text)
    root.style.setProperty('--card-foreground', text)
    root.style.setProperty('--secondary-foreground', text)
    root.style.setProperty('--sidebar-foreground', text)
    root.style.setProperty('--border', border)
    root.style.setProperty('--input', border)
    root.style.setProperty('--sidebar-border', border)
    root.style.setProperty('--primary', accent)
    root.style.setProperty('--primary-foreground', accentForeground)
    root.style.setProperty('--ring', accent)
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-foreground', accentForeground)
    root.style.setProperty('--sidebar-primary', accent)
    root.style.setProperty('--sidebar-primary-foreground', accentForeground)
    root.style.setProperty('--sidebar-ring', accent)
    root.style.setProperty('--chart-1', accent)

    if (settings.fontFamily === 'Geist') {
      root.style.removeProperty('--appearance-font-family')
    } else if (settings.fontFamily === 'Imported') {
      root.style.setProperty('--appearance-font-family', 'GrimoirImported')
    } else {
      root.style.setProperty('--appearance-font-family', JSON.stringify(settings.fontFamily))
    }

    if (settings.backgroundDataUrl) {
      root.style.setProperty('--appearance-background-image', `url(${JSON.stringify(settings.backgroundDataUrl)})`)
      root.style.setProperty('--appearance-backdrop', 'rgba(9, 12, 18, 0.72)')
    } else {
      root.style.removeProperty('--appearance-background-image')
      root.style.removeProperty('--appearance-backdrop')
    }

    if (!settings.fontDataUrl || settings.fontFamily !== 'Imported' || typeof FontFace === 'undefined') {
      return
    }

    let active = true
    let importedFont: FontFace | undefined
    const fontFace = new FontFace('GrimoirImported', `url(${JSON.stringify(settings.fontDataUrl)})`)
    fontFace
      .load()
      .then((loadedFont) => {
        if (!active) return
        importedFont = loadedFont
        document.fonts.add(loadedFont)
      })
      .catch(() => undefined)

    return () => {
      active = false
      if (importedFont) document.fonts.delete(importedFont)
    }
  }, [settings])

  return null
}
