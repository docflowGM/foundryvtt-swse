/**
 * Progression completion reader (Checkpoint B) - ONE read-only interpretation of the actor's persisted progression evidence.
 *
 * The Progression Engine records what ActorEngine committed; this module only READS those canonical records and says what they establish.
 * It owns no rules (the expected selection count and whether a rule is deferred are supplied by the caller, from the existing
 * authorities), performs no mutation, and never reconstructs history from current statistics.
 *
 * First domain: ability-score increases, read from `system.progression.abilityIncreaseHistory` (the canonical history). Other domains
 * (feats, talents, skills, Force Training, HP) keep their existing readers until they are proven equivalent; this contract is what they will
 * adopt, and it never claims verification the underlying evidence does not support.
 *
 * Completion confidence is separate from mechanical correctness: a completion can be PLAYER_ATTESTED while its effect stays unverified.
 */
import { strictLevel, strictCount, recordLevel, entitlementIdForLevel } from '../mutation/ability-increase-guard.js';

export const COMPLETION = Object.freeze({
  SYSTEM_VERIFIED: 'SYSTEM_VERIFIED',                         // committed AND post-commit verification recorded on the record
  SYSTEM_COMMITTED_UNVERIFIED: 'SYSTEM_COMMITTED_UNVERIFIED', // a recognised writer claims a system commit; no verification is recorded
  PLAYER_ATTESTED: 'PLAYER_ATTESTED',
  GM_AUTHORIZED: 'GM_AUTHORIZED',
  PARTIAL: 'PARTIAL',
  UNVERIFIABLE: 'UNVERIFIABLE',
  CONFIRMED_DISCREPANCY: 'CONFIRMED_DISCREPANCY',
});

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
/** Historical writer labels. They establish a CLAIMED source only; a label is never proof of post-commit verification. */
export const RECOGNIZED_SYSTEM_SOURCES = Object.freeze(['progression-finalizer', 'single-step-progression']);
export const MANUAL_ATTESTATION_SOURCE = 'manual-attestation';
const INACTIVE_STATUSES = new Set(['withdrawn', 'superseded']);

function selectionsOf(entry) {
  const raw = entry?.increases || entry?.abilityIncreases || {};
  const out = {};
  for (const key of ABILITY_KEYS) {
    const delta = Math.max(0, Math.floor(Number(raw?.[key] ?? 0) || 0));
    if (delta > 0) out[key] = delta;
  }
  return out;
}
const countOf = (selections) => Object.values(selections).reduce((n, d) => n + d, 0);

/** What a single history record claims to be. Pure. */
export function classifyAbilityIncreaseRecord(entry) {
  if (!entry || typeof entry !== 'object') return { kind: 'unrecognized' };
  if (INACTIVE_STATUSES.has(String(entry.status || '').toLowerCase())) return { kind: 'inactive', status: entry.status };
  if (entry.source === MANUAL_ATTESTATION_SOURCE) {
    if (entry.appliedBySystem === false && entry.evidence === 'player-confirmed') return { kind: 'player-attested' };
    if (entry.appliedBySystem === false && entry.evidence === 'gm-authorized') return { kind: 'gm-authorized' };
    return { kind: 'unrecognized' }; // claims to be manual but lacks the markers that separate it from a system record
  }
  if (RECOGNIZED_SYSTEM_SOURCES.includes(entry.source)) {
    return { kind: entry.verification?.state === 'verified' ? 'system-verified' : 'system-committed' };
  }
  return { kind: 'unrecognized' };
}

/** Merge duplicate records of the same kind for one level by max-per-ability (duplicates never count twice). */
function merge(records) {
  const out = {};
  for (const r of records) for (const [k, d] of Object.entries(selectionsOf(r))) out[k] = Math.max(out[k] || 0, d);
  return out;
}

/**
 * @param {Actor} actor
 * @param {number} level the entitlement's character level
 * @param {{expectedCount?:number|null, rulesDeferred?:string[]|boolean}} [context] supplied by the caller from the existing authorities
 */
export function getAbilityIncreaseCompletion(actor, level, { expectedCount = null, rulesDeferred = false, maxPerAbility = 1 } = {}) {
  const L = strictLevel(level);
  const progression = actor?.system?.progression || {};
  const history = Array.isArray(progression.abilityIncreaseHistory) ? progression.abilityIncreaseHistory : [];
  const deferred = Array.isArray(rulesDeferred) ? rulesDeferred.length > 0 : rulesDeferred === true;
  const base = {
    entitlementId: L ? entitlementIdForLevel(L) : null,
    type: 'ability-increase',
    level: L,
    authority: 'ProgressionReconciler._abilityIncreaseCountForActor (count) / system.progression.abilityIncreaseHistory (evidence)',
    // EVD-01: an unknown count stays UNKNOWN (null). Number(null) is 0 and must never be read as "zero increases are owed".
    expectedCount: strictCount(expectedCount),
    rulesDeferred: deferred,
  };
  if (!L) return { ...base, classification: COMPLETION.UNVERIFIABLE, applied: {}, attested: {}, gmAuthorized: {}, remainingUnknown: base.expectedCount, provenShortfall: false, evidenceSources: [], references: { sessionIds: [] }, verification: 'none', conflicts: ['invalid-level'], legacy: [] };

  const buckets = { 'system-verified': [], 'system-committed': [], 'player-attested': [], 'gm-authorized': [], unrecognized: [], inactive: [] };
  for (const entry of history) {
    if (recordLevel(entry) !== L) continue;
    buckets[classifyAbilityIncreaseRecord(entry).kind].push(entry);
  }
  // `lastAbilityIncrease` is the last system-applied EVENT, never a store of manual statements and never an override of the canonical history
  // (C6). It is only supplementary legacy evidence for a level the history does not track at all.
  const last = progression.lastAbilityIncrease;
  const tracked = Object.values(buckets).some(list => list.length);
  const legacyLast = (!tracked && last && recordLevel(last) === L) ? last : null;
  if (legacyLast) buckets[classifyAbilityIncreaseRecord(legacyLast).kind].push(legacyLast);

  const systemRecords = [...buckets['system-verified'], ...buckets['system-committed']];
  const applied = merge(systemRecords);
  const conflicts = [];
  if (buckets.unrecognized.length) conflicts.push('unrecognized-provenance-record');
  // Q1 / C7: attestations never count for a deferred-rules entitlement. Q5: an active GM-authorized statement takes precedence over player attestations.
  const manualAllowed = !deferred;
  let gm = manualAllowed ? merge(buckets['gm-authorized']) : {};
  let attested = manualAllowed ? merge(buckets['player-attested']) : {};
  // D4: a GM supersession deactivates the INTENDED record (status 'superseded'); unrelated active player attestations for the same entitlement keep counting. GM statements
  // are tallied first so that, when selections overlap, the GM-authorized part wins the shared capacity and the overlapping player claim is reported, not double counted.

  // EVD-05: system-applied and manual evidence may be MIXED for one entitlement (a short system record completed by an attestation). They are
  // combined per ability and the canonical allocation rule caps the total: a manual selection that would exceed it (for example the same ability
  // twice when stacking is not allowed) is not counted and is reported. Manual evidence never replaces or erases system evidence.
  const cap = Math.max(1, Number(maxPerAbility) || 1);
  const counted = { applied: { ...applied }, attested: {}, gm: {} };
  const used = { ...applied };
  // Manual evidence only ever fills what the system evidence has not already satisfied: it can neither exceed the entitlement nor re-label a complete system record.
  let needLeft = base.expectedCount === null ? Infinity : Math.max(0, base.expectedCount - countOf(applied));
  for (const [bucketName, bucket] of [['gm', gm], ['attested', attested]]) {
    for (const [k, d] of Object.entries(bucket)) {
      const room = Math.max(0, cap - (used[k] || 0));
      const take = Math.min(d, room, needLeft);
      if (take < d) conflicts.push(room < d ? 'overlapping-or-excess-selection' : 'selections-exceed-entitlement');
      if (take > 0) { counted[bucketName][k] = take; used[k] = (used[k] || 0) + take; needLeft -= take; }
    }
  }
  gm = counted.gm; attested = counted.attested;
  const appliedCount = countOf(applied), gmCount = countOf(gm), attestedCount = countOf(attested);
  const manualCount = gmCount + attestedCount;
  const total = appliedCount + manualCount;
  const expected = base.expectedCount;
  const verified = buckets['system-committed'].length === 0 && buckets['system-verified'].length > 0;
  const evidenceSources = [...new Set([...systemRecords, ...buckets['player-attested'], ...buckets['gm-authorized'], ...buckets.unrecognized].map(r => r.source || 'unknown'))];
  const sessionIds = [...new Set(history.filter(e => recordLevel(e) === L).map(e => e?.verification?.sessionId || e?.sessionId).filter(Boolean))];

  let classification = COMPLETION.UNVERIFIABLE;
  let provenShortfall = false;
  let remaining = expected === null ? null : Math.max(0, expected - total);
  // With an UNKNOWN count nothing can be called complete or short: the evidence is shown, the verdict stays UNVERIFIABLE.
  if (deferred) {
    // EVR-05: an unresolved count-based entitlement (RECON-002/003) is never certified: recorded history stays visible but proves nothing about a rule that is not decided.
    classification = COMPLETION.UNVERIFIABLE;
    remaining = null;
  } else if (expected !== null && total > 0) {
    if (total >= expected) {
      if (manualCount === 0) classification = verified ? COMPLETION.SYSTEM_VERIFIED : COMPLETION.SYSTEM_COMMITTED_UNVERIFIED;
      else classification = attestedCount > 0 ? COMPLETION.PLAYER_ATTESTED : COMPLETION.GM_AUTHORIZED; // weakest link: any player-attested part keeps the whole attested; GM_AUTHORIZED only when every manual part is GM
    } else {
      classification = COMPLETION.PARTIAL;
      // EVR-03: a short record - even one from a recognised system writer - does NOT prove an increase was omitted (it may have been applied by hand, or the
      // entitlement count may have changed since). The known part is kept, the remainder is UNKNOWN, and a confirmed missing-increase needs INDEPENDENT
      // evidence that history alone cannot supply, so `provenShortfall` is never set from history.
      provenShortfall = false;
    }
  }

  return {
    ...base, classification, applied, attested, gmAuthorized: gm, remainingUnknown: remaining, provenShortfall, mixed: appliedCount > 0 && manualCount > 0,
    evidenceSources, references: { sessionIds },
    verification: verified ? 'verified' : (appliedCount > 0 ? 'committed-unverified' : 'none'),
    conflicts,
    legacy: buckets.unrecognized.map(r => ({ source: r.source ?? null, increases: selectionsOf(r) })), // preserved and visible, never trusted
    inactive: buckets.inactive.length,
  };
}

/** Efficient batch form for Character Review. `levels`: [{level, expectedCount, rulesDeferred}] from the existing entitlement authority. */
export function getAbilityIncreaseCompletions(actor, levels = []) {
  const out = new Map();
  for (const spec of levels) out.set(spec.level, getAbilityIncreaseCompletion(actor, spec.level, spec));
  return out;
}

/** Generic entry point by entitlement id (`ability-increase-level-N`); other entitlement types are not interpreted by this reader yet. */
export function getEntitlementCompletion(actor, entitlementId, context = {}) {
  const m = /^ability-increase-level-(\d+)$/.exec(String(entitlementId || ''));
  if (m) return getAbilityIncreaseCompletion(actor, Number(m[1]), context);
  return { entitlementId: entitlementId ?? null, type: 'unsupported', classification: COMPLETION.UNVERIFIABLE, supported: false, conflicts: ['entitlement-type-not-supported-by-this-reader'] };
}

export default { COMPLETION, getEntitlementCompletion, getAbilityIncreaseCompletion, getAbilityIncreaseCompletions, classifyAbilityIncreaseRecord };
