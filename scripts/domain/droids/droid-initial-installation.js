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
 * logic, and prices nothing itself (the builder already accounted for the
 * cost). It creates no second ledger; the output is the same `installedSystems`
 * shape the Garage writes, with appendage identities in the C-1 vocabulary.
 *
 * ACCEPTANCE BOUNDARY. A selection is projected only if it was ACCEPTED by the
 * builder's own initial-build workflow. That workflow is injected as
 * `acceptSelection` (production: the builder quote consumer, which applies the
 * published-source review, the typed prerequisites and an exact quote in the
 * INITIAL_BUILD context). Published-source identity clearance alone is not a
 * license to install arbitrary input. With no `acceptSelection`, nothing is
 * accepted. Fields the builder does not produce have no validated acceptance
 * path and are refused, never assumed.
 *
 * Guarantees
 *  - Deterministic: the same (seed, build, existing ledger) always yields the
 *    same output; identities derive from the seed, the canonical part id and
 *    the part's ordinal. No random, no clock.
 *  - All-or-nothing: on ANY unresolved condition the returned ledger and
 *    mirror are exactly the inputs (nothing partially written).
 *  - Idempotent vs conflicting: a repeat that exactly matches the ledger's own
 *    records is accepted and reuses them; a ledger that differs from the build
 *    (different count, kind, identity, location, or a disabled/malformed
 *    record) is a CONFLICT and is reported, never skipped or overwritten.
 *  - Never invents: no left/right anatomy, capability, slot capacity or host.
 *
 * Dependencies are injected so the module has no Foundry imports.
 */
import {
  isPhysicalAppendageDefinition, isValidInstanceId, isValidLocationId, ledgerKeyForInstance, listLedgerInstances
} from './droid-appendage-instance.js';

/** Fields the builder actually produces (and whose acceptance workflow exists). */
const SINGLE_FIELDS = Object.freeze(['processor', 'locomotion', 'armor']);
const BUILDER_ARRAY_FIELDS = Object.freeze(['appendages', 'accessories', 'locomotionEnhancements', 'appendageEnhancements']);
/** Fields the builder does not produce: no validated acceptance path => refused when non-empty. */
const UNVALIDATED_ARRAY_FIELDS = Object.freeze(['sensors', 'weapons', 'integratedSystems', 'processorEnhancements', 'locomotionSystems', 'secondaryLocomotion']);
/** Draft-only mirrors whose installation is established only by the Garage ledger. */
const SKIPPED_MIRRORS = Object.freeze([
  ['backupProcessor', 'The backup-processor slot is established only by a Garage ledger record'],
  ['processorSlots.backup', 'The backup-processor slot is established only by a Garage ledger record']
]);
/** Exact boolean markers a draft locomotion row may carry for the restriction state. */
const RESTRICTION_MARKERS = Object.freeze(['restricted', 'isRestricted', 'restrictedLocomotion']);

const asEntryList = (value) => (Array.isArray(value) ? value : []).filter(e => e && typeof e === 'object');
const entryKey = (e) => e?.id ?? e?.name;
const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

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
 * @param {(definition:object, context:{field:string, entry:object, draft:object})=>{ok:boolean, reason?:string, sourceBlocked?:boolean, firstSlotUnrestricted?:boolean}} input.acceptSelection
 *        the builder's own initial-build acceptance (quote + prerequisites)
 * @returns {{seeded:boolean, installedSystems:object, droidSystems:object|null, unresolved:object[], skipped:object[]}}
 */
export function projectInitialInstallation({
  seed, droidSystems, existingLedger = {}, getDefinition, normalizeId, reviewComponent, acceptSelection
} = {}) {
  const unresolved = [];
  const skipped = [];
  const existing = isObject(existingLedger) ? existingLedger : {};
  if (!isObject(droidSystems)) {
    return { seeded: false, installedSystems: { ...existing }, droidSystems: droidSystems ?? null, unresolved, skipped };
  }
  const pristine = () => ({ seeded: false, installedSystems: { ...existing }, droidSystems: structuredClone(droidSystems), unresolved, skipped });
  const draft = structuredClone(droidSystems);
  const ledger = { ...existing };

  const { instances: existingInstances, malformed } = listLedgerInstances(existing);
  for (const bad of malformed) {
    unresolved.push({ field: 'installedSystems', id: bad.partId || bad.ledgerKey, code: 'MALFORMED_EXISTING_RECORD', reason: `The existing ledger record "${bad.ledgerKey}" is malformed (${bad.problems.join('; ')})` });
  }
  const existingPhysical = existingInstances.filter(i => !i.hostInstanceId);

  // ---- 1. Resolve and accept every builder row --------------------------------------------------
  const rows = [];   // { field, entry, canonicalId, def }
  const resolveRow = (entry, field) => {
    const raw = entryKey(entry);
    let canonicalId = normalizeId(raw);
    let def = canonicalId ? getDefinition(canonicalId) : null;
    // The builder's appendage rows carry a slot-style id ("hand-1") and the part KIND in `type`.
    // Only for the appendages list, and only when the id is not itself canonical, the published
    // kind in `type` names the part. The display name ("Hand (Right)") is never read.
    if (!def && field === 'appendages' && entry.type) {
      const kindId = normalizeId(entry.type);
      const kindDef = kindId ? getDefinition(kindId) : null;
      if (kindDef && isPhysicalAppendageDefinition(kindDef)) { canonicalId = kindId; def = kindDef; }
    }
    if (!def) {
      unresolved.push({ field, id: String(raw ?? ''), code: 'UNKNOWN_COMPONENT', reason: 'The selection does not resolve to a canonical droid component' });
      return;
    }
    const requiresHost = (() => {
      const r = def?.source?.requiresAppendage;
      return (Array.isArray(r) ? r : r == null ? [] : [r]).length > 0;
    })();
    if (requiresHost) {
      unresolved.push({ field, id: canonicalId, code: 'HOST_PROVENANCE_UNRESOLVED', reason: 'A component fitted to an appendage has no established initial-build host' });
      return;
    }
    // Restriction state of the locomotion row: only an exact boolean marker is evidence; any other
    // value is an unverified claim. (The builder offers no restricted option; see acceptance below.)
    if (field === 'locomotion') {
      const claimed = RESTRICTION_MARKERS.filter(k => entry[k] !== undefined && entry[k] !== false);
      if (claimed.length) {
        unresolved.push({ field, id: canonicalId, code: 'RESTRICTION_UNVERIFIED', reason: `The locomotion row asserts a restriction state (${claimed.join(', ')}) that the initial-build workflow does not model` });
        return;
      }
    }
    if (typeof acceptSelection !== 'function') {
      unresolved.push({ field, id: canonicalId, code: 'ACCEPTANCE_UNAVAILABLE', reason: 'No initial-build acceptance workflow was supplied, so the selection cannot be certified' });
      return;
    }
    const acceptance = acceptSelection(def, { field, entry, draft }) ?? { ok: false, reason: 'The initial-build workflow returned no decision' };
    // The builder's acceptance speaks first, so the reason names the real cause (a missing speed is
    // not reported as a source HOLD). A refusal that is itself a source-clearance refusal keeps that code.
    if (acceptance.ok !== true) {
      unresolved.push({
        field, id: canonicalId,
        code: acceptance.sourceBlocked === true ? 'SOURCE_NOT_CLEARED' : 'ACCEPTANCE_FAILED',
        reason: acceptance.reason || 'The builder\'s initial-build workflow does not accept this selection'
      });
      return;
    }
    // The "first unrestricted locomotion" fact comes from the builder's own acceptance of the
    // PRIMARY locomotion, never from a constant here. Any other slot has no such fact.
    const unrestricted = field === 'locomotion' && acceptance.firstSlotUnrestricted === true;
    const verdict = reviewComponent(def, {
      operationPhase: 'INITIAL_BUILD',
      locomotionSlotOrdinal: field === 'locomotion' ? 1 : null,
      restrictedLocomotion: unrestricted ? false : null
    });
    if (verdict?.decision === 'BLOCKED') {
      unresolved.push({ field, id: canonicalId, code: 'SOURCE_NOT_CLEARED', reason: verdict.blockingReason || 'No published-source clearance for this component in an initial build' });
      return;
    }
    rows.push({ field, entry, canonicalId, def });
  };

  for (const field of SINGLE_FIELDS) {
    const entry = draft[field];
    if (isObject(entry) && entryKey(entry)) resolveRow(entry, field);
  }
  for (const field of BUILDER_ARRAY_FIELDS) {
    for (const entry of asEntryList(draft[field])) if (entryKey(entry)) resolveRow(entry, field);
  }
  for (const field of UNVALIDATED_ARRAY_FIELDS) {
    for (const entry of asEntryList(draft[field])) {
      if (entryKey(entry)) unresolved.push({ field, id: String(entryKey(entry)), code: 'UNVALIDATED_SELECTION', reason: 'The builder does not produce this field, so no initial-build acceptance exists for it' });
    }
  }
  for (const [path, reason] of SKIPPED_MIRRORS) {
    const value = path.split('.').reduce((node, key) => (isObject(node) ? node[key] : undefined), draft);
    if (isObject(value) && entryKey(value)) skipped.push({ field: path, id: String(entryKey(value)), reason });
  }

  // ---- 2. Singleton components vs the existing ledger --------------------------------------------
  const seenSingletons = new Set();
  const toWrite = [];
  for (const row of rows.filter(r => !isPhysicalAppendageDefinition(r.def))) {
    if (seenSingletons.has(row.canonicalId)) {
      unresolved.push({ field: row.field, id: row.canonicalId, code: 'DUPLICATE_COMPONENT', reason: 'This component can be installed only once but the build lists it more than once' });
      continue;
    }
    seenSingletons.add(row.canonicalId);
    const present = existing[row.canonicalId];
    if (present === undefined) { toWrite.push(row); continue; }
    const sameComponent = isObject(present) && normalizeId(present.id ?? row.canonicalId) === row.canonicalId;
    if (!sameComponent || present.installed === false || present.enabled === false) {
      unresolved.push({ field: row.field, id: row.canonicalId, code: 'EXISTING_COMPONENT_CONFLICT', reason: 'The ledger already holds a disabled, malformed or different record under this component\'s id, so it does not represent the approved build' });
    }
    // otherwise: an existing valid record is preserved verbatim (never overwritten)
  }

  // ---- 3. Physical appendages: identity checks, then exact-match-or-seed ---------------------------
  const appendageRows = rows.filter(r => isPhysicalAppendageDefinition(r.def));
  const suppliedIds = new Map();
  const suppliedLocations = new Map();
  for (const row of appendageRows) {
    const { entry } = row;
    if (entry.instanceId !== undefined && entry.instanceId !== null) {
      if (!isValidInstanceId(entry.instanceId)) {
        unresolved.push({ field: 'appendages', id: row.canonicalId, code: 'MALFORMED_SUPPLIED_IDENTITY', reason: 'The draft row supplies an instance id that is not a well-formed identity' });
      } else if (suppliedIds.has(entry.instanceId)) {
        unresolved.push({ field: 'appendages', id: row.canonicalId, code: 'DUPLICATE_INSTANCE_ID', reason: `Two draft appendage rows supply the same instance id (${entry.instanceId})` });
      } else suppliedIds.set(entry.instanceId, row);
    }
    if (entry.locationId !== undefined && entry.locationId !== null) {
      if (!isValidLocationId(entry.locationId)) {
        unresolved.push({ field: 'appendages', id: row.canonicalId, code: 'CONFLICTING_LOCATION', reason: `The draft row supplies a location that is not a well-formed token (${entry.locationId})` });
      } else if (suppliedLocations.has(entry.locationId)) {
        unresolved.push({ field: 'appendages', id: row.canonicalId, code: 'CONFLICTING_LOCATION', reason: `Two draft appendage rows claim the same location (${entry.locationId})` });
      } else suppliedLocations.set(entry.locationId, row);
    }
  }
  if (unresolved.length) return pristine();

  // derive final identities deterministically
  const takenIds = new Set(suppliedIds.keys());
  const usedLocations = new Set(suppliedLocations.keys());
  const partOrdinal = new Map();
  let nextLocation = 0;
  const planned = appendageRows.map(row => {
    const ordinal = (partOrdinal.get(row.canonicalId) ?? 0) + 1;
    partOrdinal.set(row.canonicalId, ordinal);
    const supplied = isValidInstanceId(row.entry.instanceId) ? row.entry.instanceId : null;
    const instanceId = supplied ?? stableInstanceId(seed, row.canonicalId, ordinal, takenIds);
    takenIds.add(instanceId);
    let locationId = isValidLocationId(row.entry.locationId) ? row.entry.locationId : null;
    if (!locationId) {
      do { nextLocation += 1; } while (usedLocations.has(`appendage-slot-${nextLocation}`));
      locationId = `appendage-slot-${nextLocation}`;
      usedLocations.add(locationId);
    }
    return { ...row, instanceId, locationId };
  });

  let appendagesWrite = false;
  if (existingPhysical.length === 0) {
    appendagesWrite = planned.length > 0;
  } else {
    // The ledger already holds physical appendages: only an EXACT match is acceptable.
    const byId = new Map(existingPhysical.map(i => [i.instanceId, i]));
    const exact = planned.length === existingPhysical.length && planned.every(p => {
      const have = byId.get(p.instanceId);
      return have && have.partId === p.canonicalId && have.locationId === p.locationId;
    });
    if (!exact) {
      const describe = list => list.map(i => i.partId ?? i.canonicalId).sort().join(', ') || 'none';
      unresolved.push({
        field: 'appendages', id: planned[0]?.canonicalId ?? existingPhysical[0].partId, code: 'EXISTING_APPENDAGES_CONFLICT',
        reason: `The ledger already holds ${existingPhysical.length} physical appendage(s) (${describe(existingPhysical)}) that do not exactly match the ${planned.length} in the approved build (${describe(planned)}); neither is overwritten`
      });
      return pristine();
    }
  }

  if (unresolved.length) return pristine();

  // ---- 4. Commit to the (still local) outputs ------------------------------------------------------
  for (const row of toWrite) {
    ledger[row.canonicalId] = {
      id: row.canonicalId,
      name: row.def.name,
      category: row.def.category,
      slot: row.def.slot,
      // No `mechanicalState`: absence means the component's modifiers apply (only an explicit false
      // suppresses), and that field has its own approved writers.
      provenance: { origin: 'initial-build', bakedIntoPublishedTotals: false }
    };
  }
  for (const p of planned) {
    if (appendagesWrite) {
      ledger[ledgerKeyForInstance(p.canonicalId, p.instanceId)] = {
        id: p.canonicalId, name: p.def.name, category: p.def.category, slot: p.def.slot,
        provenance: { origin: 'initial-build', bakedIntoPublishedTotals: false },
        instanceId: p.instanceId, locationId: p.locationId
      };
    }
    // The display mirror carries the SAME identity (the ledger is the authority).
    Object.assign(p.entry, { id: p.canonicalId, instanceId: p.instanceId, locationId: p.locationId, location: p.locationId });
  }

  return { seeded: toWrite.length > 0 || appendagesWrite, installedSystems: ledger, droidSystems: draft, unresolved, skipped };
}
