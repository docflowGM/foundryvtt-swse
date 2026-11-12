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
import { strictLevel, recordLevel, entitlementIdForLevel } from '../mutation/ability-increase-guard.js';

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
export function getAbilityIncreaseCompletion(actor, level, { expectedCount = null, rulesDeferred = false } = {}) {
  const L = strictLevel(level);
  const progression = actor?.system?.progression || {};
  const history = Array.isArray(progression.abilityIncreaseHistory) ? progression.abilityIncreaseHistory : [];
  const deferred = Array.isArray(rulesDeferred) ? rulesDeferred.length > 0 : rulesDeferred === true;
  const base = {
    entitlementId: L ? entitlementIdForLevel(L) : null,
    type: 'ability-increase',
    level: L,
    authority: 'ProgressionReconciler._abilityIncreaseCountForActor (count) / system.progression.abilityIncreaseHistory (evidence)',
    expectedCount: Number.isFinite(Number(expectedCount)) ? Number(expectedCount) : null,
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
  // Attestations never count for a deferred-rules entitlement (Q1) and never together with a system record for the same level (C1: reported).
  const conflicts = [];
  if (systemRecords.length && (buckets['player-attested'].length || buckets['gm-authorized'].length)) conflicts.push('system-and-manual-records-coexist');
  const manualAllowed = !deferred && !systemRecords.length;
  const gm = manualAllowed ? merge(buckets['gm-authorized']) : {};
  const attested = manualAllowed ? merge(buckets['player-attested']) : {};
  const gmCount = countOf(gm), attestedCount = countOf(attested), appliedCount = countOf(applied);
  if (buckets.unrecognized.length) conflicts.push('unrecognized-provenance-record');

  const expected = base.expectedCount;
  const satisfied = (n) => expected !== null && n >= expected;
  const verified = buckets['system-committed'].length === 0 && buckets['system-verified'].length > 0;
  const evidenceSources = [...new Set([...systemRecords, ...buckets['player-attested'], ...buckets['gm-authorized'], ...buckets.unrecognized].map(r => r.source || 'unknown'))];
  const sessionIds = [...new Set([...history.filter(e => recordLevel(e) === L)].map(e => e?.verification?.sessionId || e?.sessionId).filter(Boolean))];

  let classification = COMPLETION.UNVERIFIABLE;
  let provenShortfall = false;
  let remaining = expected;
  if (appliedCount > 0) {
    remaining = expected === null ? null : Math.max(0, expected - appliedCount);
    if (satisfied(appliedCount)) classification = verified ? COMPLETION.SYSTEM_VERIFIED : COMPLETION.SYSTEM_COMMITTED_UNVERIFIED;
    else { classification = COMPLETION.PARTIAL; provenShortfall = expected !== null && !deferred; } // a durable system record that is short is a PROVEN shortfall
  } else if (gmCount > 0) {
    remaining = expected === null ? null : Math.max(0, expected - gmCount);
    classification = satisfied(gmCount) ? COMPLETION.GM_AUTHORIZED : COMPLETION.PARTIAL;
  } else if (attestedCount > 0) {
    remaining = expected === null ? null : Math.max(0, expected - attestedCount);
    classification = satisfied(attestedCount) ? COMPLETION.PLAYER_ATTESTED : COMPLETION.PARTIAL; // partial manual evidence: the rest is UNKNOWN, not proven missing (Q3)
  }

  return {
    ...base, classification, applied, attested, gmAuthorized: gm, remainingUnknown: remaining, provenShortfall,
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
