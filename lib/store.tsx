'use client'

/**
 * Aegis client store.
 *
 * INTERIM PERSISTENCE: state is mirrored to localStorage so the prototype
 * survives reloads within a session. The action surface (createIdentity,
 * addCredential, anchorCredential) is intentionally async and side-effect
 * shaped so it maps 1:1 onto server actions / DB writes once a database and
 * auth layer are connected — swap the localStorage read/write for fetches and
 * nothing else in the UI changes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  deriveAddress,
  generateKeyMaterial,
  makeDid,
  makeZkCommitment,
  mineBlock,
  randomHex,
  sha256Hex,
} from './crypto'
import type {
  Credential,
  CredentialType,
  Identity,
  IncidentAttestation,
  IncidentInput,
  IncidentVerificationInput,
  InfrastructureIncident,
  LedgerBlock,
  MeshNode,
  VerificationResult,
  WalletAsset,
} from './types'

const STORAGE_KEY = 'aegis_state_v1'

interface AegisState {
  identity: Identity | null
  credentials: Credential[]
  blocks: LedgerBlock[]
  nodes: MeshNode[]
  incidents: InfrastructureIncident[]
}

interface NewCredentialInput {
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
}

interface AegisContextValue extends AegisState {
  ready: boolean
  createIdentity: (displayName: string, handle: string) => Promise<Identity>
  addCredential: (input: NewCredentialInput) => Promise<Credential>
  anchorCredential: (credentialId: string) => Promise<void>
  removeCredential: (credentialId: string) => void
  reportIncident: (input: IncidentInput) => Promise<InfrastructureIncident>
  verifyIncident: (input: IncidentVerificationInput) => Promise<InfrastructureIncident>
  resetAll: () => void
  wallet: WalletAsset[]
}

const AegisContext = createContext<AegisContextValue | null>(null)

const REGIONS = [
  'Reykjavík', 'Zürich', 'Singapore', 'Toronto', 'Cape Town', 'São Paulo',
  'Tokyo', 'Frankfurt', 'Sydney', 'Dubai', 'Mumbai', 'Oslo', 'Seoul', 'Austin',
]

function generateNodes(seed: string): MeshNode[] {
  const count = 13
  const nodes: MeshNode[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const radius = 30 + ((i * 7) % 12)
    const x = 50 + Math.cos(angle) * radius
    const y = 50 + Math.sin(angle) * radius
    const roll = (i * 37 + seed.charCodeAt(i % seed.length)) % 100
    nodes.push({
      id: `node-${randomHex(4)}`,
      label: `aegis-${REGIONS[i % REGIONS.length].slice(0, 3).toLowerCase()}-${i + 1}`,
      region: REGIONS[i % REGIONS.length],
      status: roll > 88 ? 'degraded' : roll > 74 ? 'syncing' : 'online',
      latencyMs: 12 + (roll % 60),
      peers: 4 + (roll % 8),
      replicatedShards: 3 + (roll % 6),
      x: Math.round(x),
      y: Math.round(y),
    })
  }
  nodes.push({
    id: `node-self`,
    label: 'you (edge node)',
    region: 'This device',
    status: 'online',
    latencyMs: 0,
    peers: 6,
    replicatedShards: 9,
    isSelf: true,
    x: 50,
    y: 50,
  })
  return nodes
}

function loadState(): AegisState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AegisState>
    return {
      identity: parsed.identity ?? null,
      credentials: parsed.credentials ?? [],
      blocks: parsed.blocks ?? [],
      nodes: parsed.nodes ?? [],
      incidents: parsed.incidents ?? [],
    }
  } catch {
    return null
  }
}

function saveState(state: AegisState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

export function AegisProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AegisState>({
    identity: null,
    credentials: [],
    blocks: [],
    nodes: [],
    incidents: [],
  })
  const [ready, setReady] = useState(false)
  const stateRef = useRef(state)
  // Skip the very first persist run — it fires with the empty initial state on
  // mount and would clobber whatever is already saved before the load effect
  // has a chance to hydrate it.
  const skipNextPersist = useRef(true)

  // Keep a ref mirror so async actions always read the latest committed state.
  const setState = useCallback(
    (updater: AegisState | ((prev: AegisState) => AegisState)) => {
      setStateRaw((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: AegisState) => AegisState)(prev) : updater
        stateRef.current = next
        return next
      })
    },
    [],
  )

  useEffect(() => {
    const loaded = loadState()
    if (loaded) {
      stateRef.current = loaded
      setStateRaw(loaded)
    }
    skipNextPersist.current = false
    setReady(true)
  }, [])

  useEffect(() => {
    if (!skipNextPersist.current) saveState(state)
  }, [state])

  const createIdentity = useCallback(
    async (displayName: string, handle: string) => {
      const { publicKey } = generateKeyMaterial()
      const address = await deriveAddress(publicKey)
      const did = makeDid(handle)
      const identity: Identity = {
        did,
        displayName,
        handle,
        recoveryPhraseHint: randomHex(2),
        publicKey,
        address,
        createdAt: new Date().toISOString(),
        trustScore: 40,
      }

      const genesisPayload = `genesis|${did}|${address}`
      const { hash, nonce } = await mineBlock(0, '0'.repeat(64), genesisPayload)
      const genesis: LedgerBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        hash,
        previousHash: '0'.repeat(64),
        nonce,
        type: 'identity_genesis',
        payloadLabel: 'Identity genesis block',
        confirmations: 12,
      }

      setState({
        identity,
        credentials: [],
        blocks: [genesis],
        nodes: generateNodes(did),
        incidents: [],
      })
      return identity
    },
    [setState],
  )

  const anchorCredentialInternal = useCallback(
    async (credentialId: string) => {
      const cred = stateRef.current.credentials.find((c) => c.id === credentialId)
      if (!cred || cred.anchored) return

      const zkCommitment = await makeZkCommitment(cred.id, cred.subject)
      const blocks = stateRef.current.blocks
      const prev = blocks[blocks.length - 1]
      const nextIndex = blocks.length
      const previousHash = prev?.hash ?? '0'.repeat(64)
      const payload = `anchor|${cred.id}|${zkCommitment}|${await sha256Hex(cred.title + cred.issuer)}`
      const { hash, nonce } = await mineBlock(nextIndex, previousHash, payload)

      const block: LedgerBlock = {
        index: nextIndex,
        timestamp: new Date().toISOString(),
        hash,
        previousHash,
        nonce,
        type: 'credential_anchor',
        payloadLabel: `Anchored: ${cred.title}`,
        credentialId: cred.id,
        confirmations: 1,
      }

      setState((s) => ({
        ...s,
        blocks: [...s.blocks.map((b) => ({ ...b, confirmations: b.confirmations + 1 })), block],
        credentials: s.credentials.map((c) =>
          c.id === credentialId ? { ...c, anchored: true, anchoredBlockHash: hash, zkCommitment } : c,
        ),
      }))
    },
    [setState],
  )

  const addCredential = useCallback(
    async (input: NewCredentialInput) => {
      const id = `cred_${randomHex(8)}`
      const now = new Date().toISOString()
      const credential: Credential = {
        id,
        type: input.type,
        title: input.title,
        issuer: input.issuer,
        issuerDomain: input.issuerDomain,
        subject: input.subject,
        identifier: input.identifier,
        issuedDate: input.issuedDate,
        expiryDate: input.expiryDate,
        verificationUrl: input.verificationUrl,
        fileName: input.fileName,
        status: 'verifying',
        anchored: false,
        createdAt: now,
      }

      setState((s) => ({ ...s, credentials: [credential, ...s.credentials] }))

      let result: VerificationResult
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: input.type,
            issuer: input.issuer,
            issuerDomain: input.issuerDomain,
            subject: input.subject,
            identifier: input.identifier,
            verificationUrl: input.verificationUrl,
            expiryDate: input.expiryDate,
          }),
        })
        if (!res.ok) throw new Error('Verification service error')
        result = (await res.json()) as VerificationResult
      } catch {
        result = {
          status: 'needs_review',
          confidence: 0,
          checks: [
            {
              id: 'network',
              label: 'Verification service',
              description: 'Could not reach the verification pipeline.',
              status: 'fail',
              detail: 'Network error — retry verification.',
            },
          ],
          issuerResolved: false,
          summary: 'Verification could not be completed. Please retry.',
          scannedSources: [],
          completedAt: new Date().toISOString(),
        }
      }

      const updated: Credential = { ...credential, status: result.status, verification: result }

      setState((s) => {
        const trustDelta = result.status === 'verified' ? 8 : result.status === 'needs_review' ? 3 : 0
        return {
          ...s,
          identity: s.identity
            ? { ...s.identity, trustScore: Math.min(100, s.identity.trustScore + trustDelta) }
            : s.identity,
          credentials: s.credentials.map((c) => (c.id === id ? updated : c)),
        }
      })

      if (result.status === 'verified') {
        await anchorCredentialInternal(id)
      }

      return updated
    },
    [setState, anchorCredentialInternal],
  )

  const anchorCredential = useCallback(
    async (credentialId: string) => {
      await anchorCredentialInternal(credentialId)
    },
    [anchorCredentialInternal],
  )

  const reportIncident = useCallback(
    async (input: IncidentInput) => {
      const current = stateRef.current
      const identity = current.identity
      if (!identity) throw new Error('Create an Aegis identity first.')
      const credential = current.credentials.find(
        (c) => c.status === 'verified' && c.type === 'professional_license' && /water|treatment|operator/i.test(`${c.title} ${c.issuer}`),
      )
      if (!credential) throw new Error('A verified water-treatment credential is required to report this incident.')

      const now = new Date().toISOString()
      const id = `incident_${randomHex(8)}`
      const evidenceHash = await sha256Hex(JSON.stringify({ id, input, reporter: identity.did }))
      const attestation: IncidentAttestation = {
        id: `att_${randomHex(8)}`,
        incidentId: id,
        kind: 'report',
        actorDid: identity.did,
        actorName: identity.displayName,
        credentialTitle: credential.title,
        credentialId: credential.id,
        note: input.description,
        createdAt: now,
        evidenceHash,
      }
      const incident: InfrastructureIncident = {
        ...input,
        id,
        status: 'reported',
        reportedAt: now,
        updatedAt: now,
        reporterDid: identity.did,
        reporterName: identity.displayName,
        reporterCredentialId: credential.id,
        reporterCredentialTitle: credential.title,
        attestations: [attestation],
        public: true,
      }
      setState((s) => ({ ...s, incidents: [incident, ...s.incidents] }))
      return incident
    },
    [setState],
  )

  const verifyIncident = useCallback(
    async (input: IncidentVerificationInput) => {
      const current = stateRef.current
      const identity = current.identity
      if (!identity) throw new Error('Create an Aegis identity first.')
      const credential = current.credentials.find(
        (c) => c.status === 'verified' && c.type === 'professional_license' && /water|treatment|operator/i.test(`${c.title} ${c.issuer}`),
      )
      if (!credential) throw new Error('A verified water-treatment credential is required to attest to this incident.')
      const incident = current.incidents.find((item) => item.id === input.incidentId)
      if (!incident) throw new Error('Incident not found.')
      if (incident.attestations.some((a) => a.actorDid === identity.did && a.kind === 'independent_verification')) {
        throw new Error('You have already independently verified this incident.')
      }
      const now = new Date().toISOString()
      const evidenceHash = await sha256Hex(JSON.stringify({ incident, input, verifier: identity.did }))
      const attestation: IncidentAttestation = {
        id: `att_${randomHex(8)}`,
        incidentId: incident.id,
        kind: 'independent_verification',
        actorDid: identity.did,
        actorName: identity.displayName,
        credentialTitle: credential.title,
        credentialId: credential.id,
        note: input.note,
        createdAt: now,
        evidenceHash,
      }
      const updated = { ...incident, status: input.status, updatedAt: now, attestations: [...incident.attestations, attestation] }
      setState((s) => ({ ...s, incidents: s.incidents.map((item) => (item.id === incident.id ? updated : item)) }))
      return updated
    },
    [setState],
  )

  const removeCredential = useCallback(
    (credentialId: string) => {
      setState((s) => ({ ...s, credentials: s.credentials.filter((c) => c.id !== credentialId) }))
    },
    [setState],
  )

  const resetAll = useCallback(() => {
    setState({ identity: null, credentials: [], blocks: [], nodes: [], incidents: [] })
  }, [setState])

  const wallet = useMemo<WalletAsset[]>(() => {
    const verified = state.credentials.filter((c) => c.status === 'verified').length
    const trust = state.identity?.trustScore ?? 0
    return [
      {
        id: 'aegis',
        symbol: 'AEG',
        name: 'Aegis Identity Token',
        balance: Number((trust * 1.5).toFixed(2)),
        fiatValue: Number((trust * 1.5 * 0.82).toFixed(2)),
        kind: 'identity_token',
      },
      {
        id: 'ausd',
        symbol: 'aUSD',
        name: 'Aegis Stable',
        balance: Number((verified * 250 + 100).toFixed(2)),
        fiatValue: Number((verified * 250 + 100).toFixed(2)),
        kind: 'stablecoin',
      },
      {
        id: 'rep',
        symbol: 'REP',
        name: 'Reputation',
        balance: verified * 10 + Math.round(trust / 10),
        fiatValue: 0,
        kind: 'reputation',
      },
    ]
  }, [state.credentials, state.identity])

  const value: AegisContextValue = {
    ...state,
    ready,
    createIdentity,
    addCredential,
    anchorCredential,
    removeCredential,
    reportIncident,
    verifyIncident,
    resetAll,
    wallet,
  }

  return <AegisContext.Provider value={value}>{children}</AegisContext.Provider>
}

export function useAegis() {
  const ctx = useContext(AegisContext)
  if (!ctx) throw new Error('useAegis must be used within AegisProvider')
  return ctx
}
