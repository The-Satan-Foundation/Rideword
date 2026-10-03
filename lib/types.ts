// Core domain model for the Aegis self-sovereign identity system.

export type CredentialType =
  | 'government_id'
  | 'passport'
  | 'drivers_license'
  | 'academic_degree'
  | 'professional_license'
  | 'employment'
  | 'bank_account'
  | 'proof_of_address'
  | 'health_record'
  | 'other'

export type VerificationStatus =
  | 'pending'
  | 'verifying'
  | 'verified'
  | 'needs_review'
  | 'pending_issuer' // held until the issuing institution opts into the consortium
  | 'rejected'

export interface VerificationCheck {
  id: string
  label: string
  description: string
  status: 'pass' | 'fail' | 'warn' | 'skipped'
  detail?: string
  /** Whether this check requires an external provider credential to run for real. */
  requiresCredentials?: boolean
}

export interface VerificationResult {
  status: VerificationStatus
  confidence: number // 0-100
  checks: VerificationCheck[]
  issuerResolved: boolean
  /** Name of the opted-in consortium member that vouched for the credential, if any. */
  consortiumIssuer?: string
  /** True when the issuing institution has not yet joined the consortium. */
  awaitingIssuerOptIn?: boolean
  summary: string
  scannedSources: string[]
  completedAt: string
}

export interface Credential {
  id: string
  type: CredentialType
  title: string
  issuer: string
  issuerDomain?: string
  subject: string
  identifier?: string
  issuedDate?: string
  expiryDate?: string
  verificationUrl?: string
  fileName?: string
  status: VerificationStatus
  verification?: VerificationResult
  /** Whether the credential has been anchored to the ledger. */
  anchored: boolean
  anchoredBlockHash?: string
  /** Zero-knowledge proof commitment (display representation). */
  zkCommitment?: string
  createdAt: string
}

export type CompanionAccessDecision = 'resolved' | 'denied' | 'needs_consent'

export interface AegisCompanion {
  id: string
  name: string
  instanceSeed: string
  pairedDid: string
  pairedAt: string
  capabilities: string[]
  accessLog: CompanionAccessEvent[]
}

export interface CompanionAccessEvent {
  id: string
  requesterName: string
  requesterCredential: string
  requestedTopic: string
  decision: CompanionAccessDecision
  reason: string
  createdAt: string
  handshakeHash: string
}

export interface Identity {
  did: string // decentralized identifier
  displayName: string
  handle: string
  recoveryPhraseHint: string
  publicKey: string
  address: string // wallet address
  createdAt: string
  trustScore: number
  companion?: AegisCompanion
}

export interface LedgerBlock {
  index: number
  timestamp: string
  hash: string
  previousHash: string
  nonce: number
  type: 'genesis' | 'credential_anchor' | 'attestation' | 'identity_genesis'
  payloadLabel: string
  credentialId?: string
  confirmations: number
}

export type NodeStatus = 'online' | 'syncing' | 'degraded'

export interface MeshNode {
  id: string
  label: string
  region: string
  status: NodeStatus
  latencyMs: number
  peers: number
  replicatedShards: number
  isSelf?: boolean
  x: number // 0-100 layout coordinate
  y: number // 0-100 layout coordinate
}

export interface WalletAsset {
  id: string
  symbol: string
  name: string
  balance: number
  fiatValue: number
  kind: 'identity_token' | 'stablecoin' | 'reputation'
}

export type IncidentStatus = 'reported' | 'independently_verified' | 'maintenance' | 'resolved'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SensorReading {
  metric: string
  value: string
  unit: string
  observedAt: string
  sourceLabel: string
  hash: string
}

export interface IncidentAttestation {
  id: string
  incidentId: string
  kind: 'report' | 'independent_verification' | 'status_change'
  actorDid: string
  actorName: string
  credentialTitle: string
  credentialId: string
  note: string
  createdAt: string
  evidenceHash: string
}

export interface InfrastructureIncident {
  id: string
  title: string
  facility: string
  asset: string
  description: string
  status: IncidentStatus
  severity: IncidentSeverity
  reportedAt: string
  updatedAt: string
  reporterDid: string
  reporterName: string
  reporterCredentialId: string
  reporterCredentialTitle: string
  readings: SensorReading[]
  attestations: IncidentAttestation[]
  public: boolean
}

export interface IncidentInput {
  title: string
  facility: string
  asset: string
  description: string
  severity: IncidentSeverity
  readings: SensorReading[]
}

export interface IncidentVerificationInput {
  incidentId: string
  note: string
  status: 'independently_verified' | 'maintenance' | 'resolved'
}
