// G2: trusted offline snapshot producer.
//
// The ONLY way to obtain a snapshot handle that deriveRuntime()/validateRuntime() accept. The handle binds the parsed
// registry to the exact bytes the G1 validator accepted, together with the validated identity (version, SHA-256, byte
// length), the validator identity and the approved known deviations that were matched. The brand lives in a
// module-private WeakSet: a caller cannot confer certification by passing an object that merely looks like a handle,
// a clone, a JSON round trip, or a caller-supplied "validation status".
//
// Pure with respect to the filesystem: it receives bytes, never paths. The CLI reads the pinned repository paths.

import crypto from 'node:crypto';
import { validateRegistry, APPROVED_REGISTRY_VERSION } from '../validate-modification-registry.mjs';

const TRUSTED = new WeakSet();
export const VALIDATOR_IDENTITY = Object.freeze({ name: 'tools/validate-modification-registry.mjs', approvedRegistryVersion: APPROVED_REGISTRY_VERSION });

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/**
 * @param {{ registryBytes: Buffer, markdownBytes?: Buffer|null, manifest: object }} input
 * @returns {{ ok: true, handle: object } | { ok: false, error: string, report?: object }}
 */
export function produceTrustedSnapshot({ registryBytes, markdownBytes = null, manifest } = {}) {
  let report;
  try {
    report = validateRegistry({ registryBytes, markdownBytes, manifest });
  } catch (err) {
    return { ok: false, error: `G1_VALIDATION_FAILED: validator threw (${String(err?.message ?? err).slice(0, 120)})` };
  }
  if (!report.ok) return { ok: false, error: 'G1_VALIDATION_FAILED: the registry snapshot is not trusted; nothing was generated', report };
  // The identity is recomputed here from the same bytes that are parsed below; nothing is taken from a caller-supplied object.
  const digest = crypto.createHash('sha256').update(registryBytes).digest('hex');
  if (digest !== report.identity.registry.sha256 || registryBytes.length !== report.identity.registry.byteLength) {
    return { ok: false, error: 'IDENTITY_MISMATCH: validated identity does not match the bytes to be parsed' };
  }
  let registry;
  try {
    registry = JSON.parse(registryBytes.toString('utf8'));
  } catch (err) {
    return { ok: false, error: `REGISTRY_UNPARSEABLE: ${err.message}` };
  }
  if (registry.version !== manifest.registryVersion) return { ok: false, error: 'VERSION_MISMATCH: registry.version differs from the validated manifest' };
  const handle = deepFreeze({
    kind: 'swse.modification.trusted-snapshot/1',
    registry,
    identity: { version: registry.version, sha256: digest, byteLength: registryBytes.length },
    validator: {
      ...VALIDATOR_IDENTITY,
      matchedKnownDeviations: report.matchedKnownDeviations.map((d) => ({ errorCode: d.errorCode, path: d.path }))
    }
  });
  TRUSTED.add(handle);
  return { ok: true, handle };
}

/** True only for a handle minted by produceTrustedSnapshot() in this process. */
export const isTrustedSnapshot = (handle) => handle !== null && typeof handle === 'object' && TRUSTED.has(handle);
