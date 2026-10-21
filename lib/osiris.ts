import 'server-only'

export interface OsirisIssuerSignal {
  available: boolean
  source: 'osiris' | 'unavailable'
  domain?: string
  dns?: string
  threat?: string
  detail: string
}

const DEFAULT_BASE_URL = 'https://osirisai.live'

function getBaseUrl() {
  const configured = process.env.OSIRIS_BASE_URL?.trim() || DEFAULT_BASE_URL
  const url = new URL(configured)
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('OSIRIS_BASE_URL must use HTTP or HTTPS')
  }
  return url
}

/**
 * Read-only, issuer-scoped Osiris adapter.
 *
 * Osiris is intelligence context, not an identity authority. Its result can
 * increase confidence or surface a warning, but it can never verify a person
 * or credential by itself. Keep the request limited to an issuer hostname;
 * never send names, document numbers, or uploaded credential contents.
 */
export async function lookupIssuerWithOsiris(domain: string): Promise<OsirisIssuerSignal> {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '')
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/.test(normalized)) {
    return { available: false, source: 'unavailable', detail: 'Issuer domain is not valid' }
  }

  try {
    const base = getBaseUrl()
    const endpoint = new URL('/api/osint/dns', base)
    endpoint.searchParams.set('domain', normalized)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: { accept: 'application/json', 'user-agent': 'AegisIssuerAdapter/1.0' },
        cache: 'no-store',
      })

      if (!response.ok) {
        return { available: false, source: 'unavailable', domain: normalized, detail: `Osiris returned HTTP ${response.status}` }
      }

      const data = (await response.json()) as Record<string, unknown>
      return {
        available: true,
        source: 'osiris',
        domain: normalized,
        dns: typeof data.status === 'string' ? data.status : 'resolved',
        detail: `Osiris returned issuer-domain context for ${normalized}`,
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    return {
      available: false,
      source: 'unavailable',
      domain: normalized,
      detail: error instanceof Error && error.name === 'AbortError' ? 'Osiris lookup timed out' : 'Osiris unavailable',
    }
  }
}
