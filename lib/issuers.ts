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

export const CREDENTIAL_TYPE_OPTIONS: { value: CredentialType; label: string }[] = (
  Object.values(ISSUER_ADAPTERS) as IssuerAdapter[]
).map((a) => ({ value: a.type, label: a.label }))

export function getAdapter(type: CredentialType): IssuerAdapter {
  return ISSUER_ADAPTERS[type] ?? ISSUER_ADAPTERS.other
}

export { luhnValid }
