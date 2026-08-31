import type { CredentialType } from './types'

export interface IssuerAdapter {
  type: CredentialType
  label: string
  /** Authoritative sources this credential type is checked against. */
  sources: string[]
  /**
   * Whether fully authoritative verification requires connecting a licensed
   * provider (KYC vendor, government API, registry partner). When true, the
   * pipeline runs every open check it can and marks the authoritative step as
   * awaiting a provider connection instead of inventing a result.
   */
  requiresProvider: boolean
  providerHint?: string
  /** Optional format validator for the credential identifier. */
  validateIdentifier?: (value: string) => boolean
}

const luhnValid = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 12) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export const ISSUER_ADAPTERS: Record<CredentialType, IssuerAdapter> = {
  government_id: {
    type: 'government_id',
    label: 'Government ID',
    sources: ['National ID registry', 'Civil registry directory', 'Sanctions & PEP watchlists'],
    requiresProvider: true,
    providerHint: 'Connect a KYC/identity provider (e.g. Persona, Onfido, Stripe Identity).',
  },
  passport: {
    type: 'passport',
    label: 'Passport',
    sources: ['ICAO PKD (passport signing certs)', 'Issuing authority directory', 'Interpol SLTD lost/stolen registry'],
    requiresProvider: true,
    providerHint: 'Connect an eMRTD/NFC passport verification provider.',
    validateIdentifier: (v) => /^[A-Z0-9]{6,9}$/i.test(v.trim()),
  },
  drivers_license: {
    type: 'drivers_license',
    label: "Driver's License",
    sources: ['State DMV registry', 'AAMVA DLDV network'],
    requiresProvider: true,
    providerHint: 'Connect an AAMVA/DMV verification provider.',
  },
  academic_degree: {
    type: 'academic_degree',
    label: 'Academic Degree',
    sources: ['Institution registrar', 'National student clearinghouse', 'Open institution web presence'],
    requiresProvider: false,
  },
  professional_license: {
    type: 'professional_license',
    label: 'Professional License',
    sources: ['Licensing board registry', 'Public professional lookup directory'],
    requiresProvider: false,
  },
  employment: {
    type: 'employment',
    label: 'Employment',
    sources: ['Employer domain & directory', 'Business registry', 'Payroll/HR provider'],
    requiresProvider: false,
  },
  bank_account: {
    type: 'bank_account',
    label: 'Bank Account',
    sources: ['Open banking network', 'Bank routing directory', 'Micro-deposit confirmation'],
    requiresProvider: true,
    providerHint: 'Connect an open-banking provider (e.g. Plaid, Teller).',
  },
  proof_of_address: {
    type: 'proof_of_address',
    label: 'Proof of Address',
    sources: ['Utility provider directory', 'Postal address validation'],
    requiresProvider: false,
  },
  health_record: {
    type: 'health_record',
    label: 'Health Record',
    sources: ['Provider directory (NPI)', 'FHIR endpoint'],
    requiresProvider: true,
    providerHint: 'Connect a FHIR/health data provider.',
  },
  other: {
    type: 'other',
    label: 'Credential',
    sources: ['Issuer web presence', 'Public web references'],
    requiresProvider: false,
  },
}

/**
 * Consortium model (opt-in). Institutions JOIN the network by publishing a
 * verification endpoint and a signing public key to this registry. Aegis never
 * scrapes personal data — it only resolves credentials against institutions
 * that have explicitly opted in. A credential whose issuer is not yet a member
 * is held in `pending_issuer` state (never rejected) and auto-verifies the
 * moment that institution onboards in a future network update.
 *
 * `transports` lists how a member replicates attestations. `lora_mesh` means
 * the member runs a long-range radio gateway, so verification of their
 * credentials continues to function with no internet connectivity at all.
 */
export type IssuerTransport = 'internet' | 'lora_mesh' | 'satellite'

export interface ConsortiumIssuer {
  id: string
  name: string
  domain: string
  /** Public endpoint members publish so wallets can confirm a credential record. */
  verificationEndpoint: string
  /** Ed25519 signing key (display representation) the member anchors with. */
  publicKey: string
  issues: CredentialType[]
  transports: IssuerTransport[]
  joinedAt: string
  /** Coordinates for the consortium map (0-100). */
  x: number
  y: number
}

/**
 * Seed members. This is intentionally a small, explicit allow-list — the whole
 * point of the opt-in model is that this set only grows when an institution
 * chooses to join, not by crawling the web.
 */
export const CONSORTIUM_ISSUERS: ConsortiumIssuer[] = [
  {
    id: 'iss_mit',
    name: 'Massachusetts Institute of Technology',
    domain: 'mit.edu',
    verificationEndpoint: 'https://mit.edu',
    publicKey: 'ed25519:MIT7xQ2f…a91c',
    issues: ['academic_degree'],
    transports: ['internet', 'lora_mesh'],
    joinedAt: '2025-11-02T00:00:00.000Z',
    x: 24,
    y: 30,
  },
  {
    id: 'iss_estonia',
    name: 'e-Estonia Digital Identity Authority',
    domain: 'ria.ee',
    verificationEndpoint: 'https://ria.ee',
    publicKey: 'ed25519:EST4kD9m…7f02',
    issues: ['government_id', 'passport', 'proof_of_address'],
    transports: ['internet', 'lora_mesh', 'satellite'],
    joinedAt: '2025-10-18T00:00:00.000Z',
    x: 70,
    y: 22,
  },
  {
    id: 'iss_who',
    name: 'World Health Organization Credentialing',
    domain: 'who.int',
    verificationEndpoint: 'https://who.int',
    publicKey: 'ed25519:WHO2pL5x…c8d1',
    issues: ['health_record', 'professional_license'],
    transports: ['internet', 'satellite'],
    joinedAt: '2025-12-01T00:00:00.000Z',
    x: 52,
    y: 64,
  },
  {
    id: 'iss_swift',
    name: 'Open Banking Consortium',
    domain: 'openbanking.org.uk',
    verificationEndpoint: 'https://openbanking.org.uk',
    publicKey: 'ed25519:OBC9zR1a…44be',
    issues: ['bank_account', 'employment'],
    transports: ['internet', 'lora_mesh'],
    joinedAt: '2026-01-14T00:00:00.000Z',
    x: 82,
    y: 58,
  },
]

/** Resolve an opted-in member for a credential by domain or fuzzy name match. */
export function resolveConsortiumIssuer(
  type: CredentialType,
  issuer: string,
  issuerDomain?: string,
): ConsortiumIssuer | undefined {
  const domain = (issuerDomain || '').toLowerCase().replace(/^www\./, '')
  const name = (issuer || '').toLowerCase()
  return CONSORTIUM_ISSUERS.find((m) => {
    const domainMatch = domain && (domain === m.domain || domain.endsWith(`.${m.domain}`))
    const nameMatch = name && (name.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(name))
    return (domainMatch || nameMatch) && m.issues.includes(type)
  })
}

export const CREDENTIAL_TYPE_OPTIONS: { value: CredentialType; label: string }[] = (
  Object.values(ISSUER_ADAPTERS) as IssuerAdapter[]
).map((a) => ({ value: a.type, label: a.label }))

export function getAdapter(type: CredentialType): IssuerAdapter {
  return ISSUER_ADAPTERS[type] ?? ISSUER_ADAPTERS.other
}

export { luhnValid }
