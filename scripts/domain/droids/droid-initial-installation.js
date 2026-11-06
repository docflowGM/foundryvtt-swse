/**
 * Initial droid installation projection (Gate C-3A) -- PURE and DETERMINISTIC.
 *
 * Droid chargen and droid-follower creation finalize `system.droidSystems`
 * (the build DRAFT / display mirror). Since Gate C-1 the authoritative record
 * of installed hardware is the `system.installedSystems` ledger, so a newly
 * created droid must start with a ledger that agrees with the build. This
 * module projects the verified build selections into that ledger.
 *
 * It is NOT a purchase: it charges nothing, calls no store or transaction
 * logic, and quotes nothing (the builder already accounted for the cost). It
 * creates no second ledger; the output is the same `installedSystems` shape the
 * Garage writes, and appendage identities use the C-1 vocabulary.
 *
 * Guarantees
 *  - Deterministic: the same (seed, build) always yields the same output, so
 *    previews, retries, recomputation and repeated finalization never mint new
 *    identities. Appendage ids derive from the seed, the canonical part id and
 *    the part's ordinal; an identity already present on a draft entry is kept.
 *  - Fail closed: a selection that cannot be mapped to a canonical, source-
 *    cleared component is reported in `unresolved` (with the reason); nothing
 *    is silently dropped or promoted.
 *  - Never invents: no left/right anatomy, capability, slot capacity or host.
 *    Draft-only categories whose installation provenance is established only
 *    by the Garage (the backup-processor slot mirrors) are reported in
 *    `skipped`, not installed.
 *  - Never overwrites: records already in the ledger win; if the ledger
 *    already holds physical appendage instances, no appendage is seeded.
 *
 * Dependencies are injected so the module has no Foundry imports.
 */
import {
  isPhysicalAppendageDefinition, isValidInstanceId, ledgerKeyForInstance, listLedgerInstances
} from './droid-appendage-instance.js';

/** droidSystems fields that hold installable components (same list the resolver reads). */
const SINGLE_FIELDS = Object.freeze(['processor', 'locomotion', 'armor']);
const ARRAY_FIELDS = Object.freeze([
  'appendages', 'sensors', 'weapons', 'accessories', 'integratedSystems',
  'processorEnhancements', 'locomotionSystems', 'secondaryLocomotion',
  'appendageEnhancements', 'locomotionEnhancements'
]);
/** Draft-only mirrors whose installation is established only by the Garage ledger. */
const SKIPPED_MIRRORS = Object.freeze([
  ['backupProcessor', 'The backup-processor slot is established only by a Garage ledger record'],
  ['processorSlots.backup', 'The backup-processor slot is established only by a Garage ledger record']
]);

const asEntryList = (value) => (Array.isArray(value) ? value : []).filter(e => e && typeof e === 'object');
const entryKey = (e) => e?.id ?? e?.name;

/** cyrb53: small deterministic 53-bit string hash (no randomness, no Date). */
function hash53(text, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Deterministic, well-formed instance id for (seed, part, ordinal); re-salted only on a collision. */
export function stableInstanceId(seed, partId, ordinal, taken = new Set()) {
  for (let salt = 0; salt < 64; salt += 1) {
    const key = `${seed}|${partId}|${ordinal}|${salt}`;
    const body = (hash53(key, 1).toString(36) + hash53(key, 2).toString(36)).replace(/[^a-z0-9]/g, '').padEnd(12, '0').slice(0, 12);
    const id = `inst-${body}`;
    if (isValidInstanceId(id) && !taken.has(id)) return id;
  }
  throw new Error('Unable to derive a unique initial appendage instance id');
}

/**
 * @param {object} input
 * @param {string} input.seed            stable per-actor seed (the actor id)
 * @param {object|null} input.droidSystems  the finalized build draft
 * @param {object} [input.existingLedger]   actor.system.installedSystems at finalization
 * @param {(id:string)=>object|null} input.getDefinition  canonical catalog lookup
 * @param {(value:unknown)=>string} input.normalizeId     canonical id normalizer
 * @param {(definition:object, context:object)=>{decision:string, blockingReason?:string}} input.reviewComponent
 *        published-source clearance in the INITIAL_BUILD context
 * @returns {{seeded:boolean, installedSystems:object, droidSystems:object|null, unresolved:object[], skipped:object[]}}
 */
export function projectInitialInstallation({
  seed, droidSystems, existingLedger = {}, getDefinition, normalizeId, reviewComponent
} = {}) {
  const unresolved = [];
  const skipped = [];
  if (!droidSystems || typeof droidSystems !== 'object') {
    return { seeded: false, installedSystems: { ...(existingLedger ?? {}) }, droidSystems: droidSystems ?? null, unresolved, skipped };
  }
  const draft = structuredClone(droidSystems);
  const ledger = { ...(existingLedger && typeof existingLedger === 'object' ? existingLedger : {}) };
  const existingInstances = new Map(listLedgerInstances(ledger).instances.map(i => [i.instanceId, i]));
  const existingPhysical = existingInstances.size > 0;

  // Ids used in THIS projection only. Existing ledger ids are deliberately not
  // "taken": a repeated finalization must re-derive its own identities and
  // recognize them, not salt past them.
  const taken = new Set();
  for (const entry of asEntryList(draft.appendages)) if (isValidInstanceId(entry.instanceId)) taken.add(entry.instanceId);

  const seenSingletons = new Set();
  const partOrdinal = new Map();
  let locationOrdinal = 0;
  let wrote = false;

  const review = (def, field, index) => reviewComponent(def, {
    operationPhase: 'INITIAL_BUILD',
    locomotionSlotOrdinal: field === 'locomotion' ? 1 : (field === 'locomotionSystems' || field === 'secondaryLocomotion' ? index + 2 : null),
    restrictedLocomotion: false
  });

  const resolveEntry = (entry, field, index) => {
    const raw = entryKey(entry);
    let canonicalId = normalizeId(raw);
    let def = canonicalId ? getDefinition(canonicalId) : null;
    // The builder's appendage rows carry a slot-style id ("hand-1") and the
    // part KIND in `type`. Only for the appendages list, and only when the id
    // is not itself canonical, the published kind in `type` names the part. The
    // row's display name ("Hand (Right)") is never read: no anatomy is inferred.
    if (!def && field === 'appendages' && entry.type) {
      const kindId = normalizeId(entry.type);
      const kindDef = kindId ? getDefinition(kindId) : null;
      if (kindDef && isPhysicalAppendageDefinition(kindDef)) { canonicalId = kindId; def = kindDef; }
    }
    if (!def) {
      unresolved.push({ field, id: String(raw ?? ''), code: 'UNKNOWN_COMPONENT', reason: 'The selection does not resolve to a canonical droid component' });
      return null;
    }
    const verdict = review(def, field, index);
    if (verdict?.decision === 'BLOCKED') {
      unresolved.push({ field, id: canonicalId, code: 'SOURCE_NOT_CLEARED', reason: verdict.blockingReason || 'No published-source clearance for this component in an initial build' });
      return null;
    }
    const raw2 = def?.source?.requiresAppendage;
    const needsHost = (Array.isArray(raw2) ? raw2 : raw2 == null ? [] : [raw2]).length > 0;
    if (needsHost) {
      unresolved.push({ field, id: canonicalId, code: 'HOST_PROVENANCE_UNRESOLVED', reason: 'A component fitted to an appendage has no established initial-build host' });
      return null;
    }
    return { canonicalId, def };
  };

  const ledgerEntry = (canonicalId, def) => ({
    id: canonicalId,
    name: def.name,
    category: def.category,
    slot: def.slot,
    // No `mechanicalState`: absence means the component's modifiers apply (only an
    // explicit false suppresses), and that field has its own approved writers.
    provenance: { origin: 'initial-build', bakedIntoPublishedTotals: false }
  });

  const seedSingleton = (entry, field, index) => {
    const resolved = resolveEntry(entry, field, index);
    if (!resolved) return;
    const { canonicalId, def } = resolved;
    if (isPhysicalAppendageDefinition(def)) return seedAppendage(entry, canonicalId, def, field);
    if (seenSingletons.has(canonicalId)) {
      unresolved.push({ field, id: canonicalId, code: 'DUPLICATE_COMPONENT', reason: 'This component can be installed only once but the build lists it more than once' });
      return;
    }
    seenSingletons.add(canonicalId);
    if (ledger[canonicalId] === undefined) {
      ledger[canonicalId] = ledgerEntry(canonicalId, def);
      wrote = true;
    }
  };

  const seedAppendage = (entry, canonicalId, def) => {
    const ordinal = (partOrdinal.get(canonicalId) ?? 0) + 1;
    partOrdinal.set(canonicalId, ordinal);
    const keepId = isValidInstanceId(entry.instanceId) ? entry.instanceId : null;
    if (keepId) taken.delete(keepId);
    const instanceId = keepId ?? stableInstanceId(seed, canonicalId, ordinal, taken);
    taken.add(instanceId);

    const existing = existingInstances.get(instanceId);
    if (existing) {
      // Idempotent repeat: this build's own record is already in the ledger.
      // Reuse it verbatim (its location included) and make the mirror agree.
      if (existing.partId !== canonicalId) {
        unresolved.push({ field: 'appendages', id: canonicalId, code: 'INSTANCE_ID_COLLISION', reason: 'A derived appendage identity collides with a different installed component' });
        return;
      }
      Object.assign(entry, { id: canonicalId, instanceId, locationId: existing.locationId, location: existing.locationId });
      return;
    }
    if (existingPhysical) {
      skipped.push({ field: 'appendages', id: canonicalId, reason: 'The ledger already holds different physical appendage instances; none is seeded over them' });
      return;
    }
    locationOrdinal += 1;
    const locationId = `appendage-slot-${locationOrdinal}`;
    ledger[ledgerKeyForInstance(canonicalId, instanceId)] = {
      ...ledgerEntry(canonicalId, def), instanceId, locationId
    };
    wrote = true;
    // The display mirror carries the SAME identity (the ledger is the authority).
    Object.assign(entry, { id: canonicalId, instanceId, locationId, location: locationId });
  };

  for (const field of SINGLE_FIELDS) {
    const entry = draft[field];
    if (entry && typeof entry === 'object' && entryKey(entry)) seedSingleton(entry, field, 0);
  }
  for (const field of ARRAY_FIELDS) {
    asEntryList(draft[field]).forEach((entry, index) => { if (entryKey(entry)) seedSingleton(entry, field, index); });
  }
  for (const [path, reason] of SKIPPED_MIRRORS) {
    const value = path.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), draft);
    if (value && typeof value === 'object' && entryKey(value)) skipped.push({ field: path, id: String(entryKey(value)), reason });
  }

  return { seeded: wrote && unresolved.length === 0, installedSystems: ledger, droidSystems: draft, unresolved, skipped };
}
