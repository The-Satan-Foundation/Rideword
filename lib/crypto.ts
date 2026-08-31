// Cryptographic helpers. Real SHA-256 via the Web Crypto API (available in the
// browser and on the server). Deterministic display helpers use a fast
// non-cryptographic hash purely for stable visual identifiers.

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Fast deterministic 32-bit hash (FNV-1a) for stable, non-secret display ids. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return bytesToHex(arr)
}

/** Derive a wallet-style address from a public key string. */
export async function deriveAddress(publicKey: string): Promise<string> {
  const h = await sha256Hex(publicKey)
  return `0x${h.slice(0, 40)}`
}

/** Generate a new keypair-like identity material (display representation). */
export function generateKeyMaterial() {
  const publicKey = `ed25519:${randomHex(32)}`
  return { publicKey }
}

/** Build a decentralized identifier. */
export function makeDid(handle: string): string {
  const suffix = randomHex(8)
  const clean = handle.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'anon'
  return `did:aegis:${clean}:${suffix}`
}

/**
 * Produce a zero-knowledge proof commitment for a credential. In a real system
 * this is a Groth16/PLONK commitment proving the credential's validity without
 * revealing its contents. Here we derive a stable commitment hash from a salted
 * digest of the credential material.
 */
export async function makeZkCommitment(
  credentialId: string,
  subject: string,
): Promise<string> {
  const salt = randomHex(16)
  const commitment = await sha256Hex(`zk|${credentialId}|${subject}|${salt}`)
  return `zk1${commitment.slice(0, 58)}`
}

export function shortHash(hash: string, lead = 6, tail = 4): string {
  if (!hash) return ''
  if (hash.length <= lead + tail + 3) return hash
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}

/**
 * Mine a block hash by finding a nonce whose SHA-256 digest starts with a small
 * difficulty prefix. Real proof-of-work, kept intentionally low-difficulty so it
 * completes near-instantly in the browser.
 */
export async function mineBlock(
  index: number,
  previousHash: string,
  payload: string,
  difficulty = 2,
): Promise<{ hash: string; nonce: number }> {
  const prefix = '0'.repeat(difficulty)
  let nonce = 0
  // Cap iterations so we never hang the UI; fall back to whatever we have.
  const maxNonce = 250_000
  while (nonce < maxNonce) {
    const hash = await sha256Hex(`${index}|${previousHash}|${payload}|${nonce}`)
    if (hash.startsWith(prefix)) return { hash, nonce }
    nonce++
  }
  const hash = await sha256Hex(`${index}|${previousHash}|${payload}|${nonce}`)
  return { hash, nonce }
}
