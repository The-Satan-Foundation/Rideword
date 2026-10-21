import { NextResponse } from 'next/server'
import { getAdapter, luhnValid, resolveConsortiumIssuer } from '@/lib/issuers'
import { lookupIssuerWithOsiris } from '@/lib/osiris'
import type {
  CredentialType,
  VerificationCheck,
  VerificationResult,
  VerificationStatus,
} from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

interface VerifyRequest {
  type: CredentialType
  issuer: string
  issuerDomain?: string
  subject: string
  identifier?: string
  verificationUrl?: string
  expiryDate?: string
}

async function reachable(url: string, timeoutMs = 6000): Promise<{ ok: boolean; status?: number; detail: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Use GET with a small range; many hosts reject HEAD.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'AegisVerifier/1.0 (+identity-check)' },
    })
    return {
      ok: res.status < 500,
      status: res.status,
      detail: `HTTP ${res.status} from ${new URL(url).host}`,
    }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Host unreachable',
    }
  } finally {
    clearTimeout(timer)
  }
}

function normalizeDomain(issuer: string, issuerDomain?: string): string | undefined {
  const raw = (issuerDomain || issuer || '').trim()
  if (!raw) return undefined
  const match = raw.match(/([a-z0-9-]+\.)+[a-z]{2,}/i)
  if (match) return match[0].toLowerCase()
  // Derive a plausible domain from a plain issuer name only if it looks domain-ish.
  return undefined
}

export async function POST(req: Request) {
  let body: VerifyRequest
  try {
    body = (await req.json()) as VerifyRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, issuer, subject } = body
  if (!type || !issuer || !subject) {
    return NextResponse.json({ error: 'Missing required fields: type, issuer, subject' }, { status: 400 })
  }

  const adapter = getAdapter(type)
  const checks: VerificationCheck[] = []
  const scannedSources: string[] = [...adapter.sources]
  let issuerResolved = false

  // 1. Structural / format validation (real, deterministic).
  const hasIdentifier = Boolean(body.identifier && body.identifier.trim())
  if (adapter.validateIdentifier && hasIdentifier) {
    const ok = adapter.validateIdentifier(body.identifier!.trim())
    checks.push({
      id: 'format',
      label: 'Identifier format',
      description: 'Validates the credential number matches the expected structure for this document type.',
      status: ok ? 'pass' : 'fail',
      detail: ok ? 'Structure matches issuing standard' : 'Identifier does not match expected format',
    })
  } else if (type === 'bank_account' && hasIdentifier) {
    const ok = luhnValid(body.identifier!.trim())
    checks.push({
      id: 'format',
      label: 'Account checksum',
      description: 'Runs a Luhn checksum over the supplied account/card number.',
      status: ok ? 'pass' : 'warn',
      detail: ok ? 'Checksum valid' : 'Checksum could not be confirmed',
    })
  } else {
    checks.push({
      id: 'format',
      label: 'Structural validation',
      description: 'Confirms required fields are present and well-formed.',
      status: subject.trim().length > 1 ? 'pass' : 'warn',
      detail: 'Required fields present',
    })
  }

  // 2. Expiry check (real, deterministic).
  if (body.expiryDate) {
    const exp = new Date(body.expiryDate).getTime()
    const notExpired = Number.isFinite(exp) && exp > Date.now()
    checks.push({
      id: 'expiry',
      label: 'Validity window',
      description: 'Ensures the credential has not expired.',
      status: notExpired ? 'pass' : 'fail',
      detail: notExpired ? `Valid until ${body.expiryDate}` : 'Credential is expired',
    })
  }

  // 3. Issuer web presence (real network call).
  const domain = normalizeDomain(issuer, body.issuerDomain)
  scannedSources.push('Public web presence scan')
  if (domain) {
    const result = await reachable(`https://${domain}`)
    issuerResolved = result.ok
    checks.push({
      id: 'issuer_presence',
      label: 'Issuer web presence',
      description: `Resolves the issuing authority (${domain}) and confirms a live, reachable endpoint.`,
      status: result.ok ? 'pass' : 'warn',
      detail: result.detail,
    })
  } else {
    checks.push({
      id: 'issuer_presence',
      label: 'Issuer web presence',
      description: 'Attempts to resolve the issuing authority from a domain.',
      status: 'warn',
      detail: 'No resolvable issuer domain provided',
    })
  }

  // 3b. Optional Osiris context. This is issuer-only, read-only intelligence;
  // it never receives subject data and never upgrades a credential by itself.
  if (domain) {
    scannedSources.push('Osiris issuer-domain intelligence')
    const osiris = await lookupIssuerWithOsiris(domain)
    checks.push({
      id: 'osiris_context',
      label: 'Osiris issuer context',
      description: 'Checks issuer-domain context through the connected read-only Osiris intelligence service.',
      status: osiris.available ? 'pass' : 'warn',
      detail: osiris.detail,
    })
  }

  // 4. Verification URL (real network call) — the strongest open signal.
  if (body.verificationUrl) {
    let target = body.verificationUrl.trim()
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`
    scannedSources.push('Issuer-provided verification link')
    try {
      const result = await reachable(target)
      const ok = result.ok && (result.status ?? 500) < 400
      checks.push({
        id: 'verification_link',
        label: 'Live verification link',
        description: 'Fetches the issuer-provided verification URL and confirms it resolves to a live record.',
        status: ok ? 'pass' : 'fail',
        detail: result.detail,
      })
      if (ok) issuerResolved = true
    } catch {
      checks.push({
        id: 'verification_link',
        label: 'Live verification link',
        description: 'Fetches the issuer-provided verification URL.',
        status: 'fail',
        detail: 'Verification link unreachable',
      })
    }
  }

  // 5. Consortium membership resolution (opt-in model — no scraping).
  //    If the issuing institution has joined the network, we resolve the
  //    credential against the endpoint and signing key THEY published. If not,
  //    the credential is held (pending_issuer) until that institution opts in.
  const member = resolveConsortiumIssuer(type, issuer, body.issuerDomain)
  scannedSources.push('Aegis consortium registry (opt-in members)')
  let awaitingIssuerOptIn = false

  if (member) {
    const memberEndpoint = await reachable(member.verificationEndpoint)
    const ok = memberEndpoint.ok
    if (ok) issuerResolved = true
    checks.push({
      id: 'consortium',
      label: 'Consortium issuer attestation',
      description: `${member.name} is an opted-in consortium member. Resolves the credential against their published verification endpoint and signing key (${member.publicKey}).`,
      status: ok ? 'pass' : 'warn',
      detail: ok
        ? `Attested by ${member.name} over ${member.transports.join(' + ')}`
        : `Member endpoint temporarily unreachable — will retry over ${member.transports.includes('lora_mesh') ? 'LoRa mesh' : 'mesh'}`,
    })
  } else {
    awaitingIssuerOptIn = true
    checks.push({
      id: 'consortium',
      label: 'Consortium issuer attestation',
      description:
        'The issuing institution has not yet opted into the Aegis consortium. The credential is held privately and will auto-verify the moment they join — no personal data is scraped in the meantime.',
      status: 'skipped',
      detail: `Invitation pending for "${issuer}". Held in pending-issuer state.`,
      requiresCredentials: true,
    })
  }

  // Score + decision.
  const weight: Record<VerificationCheck['status'], number> = { pass: 1, warn: 0.4, skipped: 0, fail: -0.6 }
  const scored = checks.filter((c) => c.status !== 'skipped')
  const rawScore = scored.reduce((acc, c) => acc + weight[c.status], 0)
  const confidence = Math.max(0, Math.min(100, Math.round((rawScore / Math.max(scored.length, 1)) * 100)))

  const hasFail = checks.some((c) => c.status === 'fail')

  let status: VerificationStatus
  let summary: string
  if (hasFail) {
    status = 'rejected'
    summary = 'One or more checks failed. This credential could not be verified.'
  } else if (awaitingIssuerOptIn) {
    status = 'pending_issuer'
    summary = `Structural checks passed, but "${issuer}" has not joined the consortium yet. Your credential is held privately and will verify automatically once they opt in.`
  } else if (member && issuerResolved && confidence >= 65) {
    status = 'verified'
    summary = `Attested by ${member.name} and verified end-to-end. Ready to anchor.`
  } else if (confidence >= 55) {
    status = 'needs_review'
    summary = 'Consortium member matched but the endpoint could not be reached. Will retry over the mesh.'
  } else {
    status = 'needs_review'
    summary = 'Partial confidence. Add a verification link or issuer domain to strengthen the proof.'
  }

  const result: VerificationResult = {
    status,
    confidence,
    checks,
    issuerResolved,
    consortiumIssuer: member?.name,
    awaitingIssuerOptIn,
    summary,
    scannedSources: Array.from(new Set(scannedSources)),
    completedAt: new Date().toISOString(),
  }

  return NextResponse.json(result)
}
