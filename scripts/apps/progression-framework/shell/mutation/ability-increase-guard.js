/**
 * Ability-increase entitlement guard (Checkpoint A).
 *
 * An ability-score increase is ADDITIVE (`base = old + delta`), so it must never be applied twice for one entitlement and must always
 * be attributed to the level of the entitlement being resolved - never to "the actor's current level", never to 0/null.
 *
 * Pure helpers + one tiny in-process registry. No rules are decided here: the entitlement COUNT stays with the reconciler / progression
 * authorities; this module only enforces identity, "at most one active record per entitlement", and write-time revalidation.
 */
export const ABILITY_HISTORY_KEY = 'system.progression.abilityIncreaseHistory';
export const LAST_ABILITY_INCREASE_KEY = 'system.progression.lastAbilityIncrease';
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ID_RE = /^ability-increase-level-(\d+)$/;

export class AbilityIncreaseError extends Error {
  constructor(code, message) { super(message); this.name = 'AbilityIncreaseError'; this.code = code; }
}

/** EVD-01: an entitlement COUNT is a positive integer or UNKNOWN (null). null / undefined / '' / 0 / negatives / NaN / non-integers never become 0 or any other number. */
export function strictCount(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * EVR-04: validate a submitted ability-increase selection WITHOUT modifying it. Every problem is a refusal; nothing is clamped, rounded or dropped.
 * Absent / undefined / 0 mean "no increase". null, '', NaN, strings, fractions, negatives, unknown ability keys, a single ability above the allocation
 * cap, and a total different from the entitled count are all rejected.
 * @returns {{increases:object, total:number}} the selection exactly as submitted (positive entries only)
 */
export function validateSelectionShape(rawIncreases, { maxPerAbility }) {
  const fail = (code, message) => { throw new AbilityIncreaseError(code, `${message}; nothing was changed.`); };
  if (rawIncreases === null || typeof rawIncreases !== 'object' || Array.isArray(rawIncreases)) fail('INVALID_SELECTION', 'The ability-increase selection is not an object');
  const increases = {};
  let total = 0;
  for (const [key, value] of Object.entries(rawIncreases)) {
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('INVALID_SELECTION_VALUE', `The increase for "${key}" is not a number`);
    if (!Number.isInteger(value) || value < 0) fail('INVALID_SELECTION_VALUE', `The increase for "${key}" (${value}) must be a whole number, zero or more`);
    if (value === 0) continue;
    if (!ABILITY_KEYS.includes(key)) fail('UNKNOWN_ABILITY', `"${key}" is not an ability`);
    if (value > maxPerAbility) fail('ALLOCATION_NOT_ALLOWED', `${key.toUpperCase()} +${value} exceeds the allowed ${maxPerAbility} per ability under the current allocation rule`);
    increases[key] = value; total += value;
  }
  return { increases, total };
}

export function validateAbilitySelection(rawIncreases, { maxPerAbility, entitledCount }) {
  const result = validateSelectionShape(rawIncreases, { maxPerAbility });
  if (result.total !== entitledCount) throw new AbilityIncreaseError('ENTITLEMENT_COUNT_MISMATCH', `This entitlement grants ${entitledCount} ability increase(s) but ${result.total} were selected; nothing was changed.`);
  return result;
}

export const newTransactionId = () => `abtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const entitlementIdForLevel = (level) => `ability-increase-level-${level}`;

/** Strict positive integer or null. null / undefined / '' / 0 / negatives / NaN / non-integers / booleans are NOT levels. */
export function strictLevel(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function levelFromEntitlementId(id) {
  const m = ID_RE.exec(String(id ?? ''));
  return m ? strictLevel(m[1]) : null;
}

const present = (v) => v !== null && v !== undefined && v !== '';

/**
 * The level of the entitlement being resolved. Sources: the explicit level the attribute step carried, the slot / entitlement id, and the
 * level-up manifest. Anything present but invalid, or two valid sources that disagree, FAILS CLOSED. No source at all FAILS CLOSED.
 * @returns {{level:number, entitlementId:string}}
 */
export function resolveEntitlementLevel({ attr = {}, manifest = null } = {}) {
  const sources = [
    ['attr.abilityIncreaseLevel', attr?.abilityIncreaseLevel, strictLevel],
    ['attr.slotId', attr?.slotId, levelFromEntitlementId],
    ['manifest.characterLevel', manifest?.characterLevel, strictLevel],
  ];
  const found = new Map();
  for (const [name, raw, parse] of sources) {
    if (!present(raw)) continue;
    const level = parse(raw);
    if (level === null) throw new AbilityIncreaseError('INVALID_ENTITLEMENT_LEVEL', `Ability-increase entitlement level is invalid (${name} = ${JSON.stringify(raw)}); nothing was changed.`);
    found.set(name, level);
  }
  const distinct = new Set(found.values());
  if (distinct.size === 0) throw new AbilityIncreaseError('MISSING_ENTITLEMENT_LEVEL', 'Ability-increase entitlement level is missing; nothing was changed.');
  if (distinct.size > 1) throw new AbilityIncreaseError('ENTITLEMENT_LEVEL_CONFLICT', `Ability-increase entitlement level is ambiguous (${[...found].map(([k, v]) => `${k}=${v}`).join(', ')}); nothing was changed.`);
  const level = [...distinct][0];
  return { level, entitlementId: entitlementIdForLevel(level) };
}

export const recordLevel = (entry = {}) => strictLevel(entry?.level ?? entry?.characterLevel ?? entry?.acquiredAtLevel ?? entry?.sourceLevel);

export function recordsForLevel(history, level) {
  return (Array.isArray(history) ? history : []).filter(entry => recordLevel(entry) === level);
}

/** C1 / C2: one active record per entitlement. An existing record - complete, partial, or later a manual acknowledgment - blocks a new application. */
export function assertEntitlementOpen(history, level) {
  const existing = recordsForLevel(history, level);
  if (existing.length) {
    throw new AbilityIncreaseError('ENTITLEMENT_ALREADY_RECORDED', `The level ${level} ability increase already has a recorded entry; applying it again would increase the scores twice. Nothing was changed.`);
  }
}

/** The ability-increase transaction a mutation plan's `set` describes (from the latest-event record the builder emits), or null. */
export function describeAbilityTransaction(planSet) {
  const record = planSet?.[LAST_ABILITY_INCREASE_KEY];
  if (!record || typeof record !== 'object' || !record.increases) return null;
  const level = strictLevel(record.level);
  const bases = {};
  for (const key of ABILITY_KEYS) {
    const delta = Number(record.increases?.[key] || 0) || 0;
    const next = planSet?.[`system.attributes.${key}.base`];
    if (delta > 0 && Number.isFinite(Number(next))) bases[key] = { delta, next: Number(next) };
  }
  // every ability-score key the plan touches in ANY way (used to prove exact correspondence with the declared selection)
  const touched = Object.keys(planSet || {}).filter(k => /^system\.(attributes|abilities)\.(str|dex|con|int|wis|cha)(\.|$)/.test(k));
  return { level, record, bases, touched };
}

const inFlight = new Set();
export const _resetAbilityIncreaseGuard = () => inFlight.clear();

/**
 * Transaction-boundary guard, called immediately before the plan is handed to ActorEngine.
 *  - refuses a plan whose entitlement level is not a valid positive integer;
 *  - refuses a concurrent second application of the same entitlement from this client;
 *  - RE-READS the actor now: refuses if the entitlement has since been recorded, or if any increased score no longer has the value the plan
 *    was built from (another client or a manual edit changed it between preparation and commit).
 * Scores are written as absolute values, so two identical stale submissions also cannot stack; the residual cross-client race (two different
 * selections prepared from the same stale read) is narrowed to this revalidation window, not eliminated - Foundry has no document transaction.
 * @returns {{ok:boolean, error?:string, code?:string, release:Function}}
 */
/**
 * EVR-02: exact correspondence between the evidence the plan will write and the score mutations it contains, checked BEFORE commit against the
 * actor's CURRENT bases. Every declared positive increase has exactly one `base` mutation equal to current + delta; no other ability-score key is
 * touched; the history and latest-event records in the plan carry the same transaction, entitlement and selection. Returns problems (empty = exact).
 */
export function checkPlanEvidenceEquivalence(actor, planSet) {
  const info = describeAbilityTransaction(planSet);
  if (!info) return [];
  const problems = [];
  const declared = {};
  for (const key of ABILITY_KEYS) { const d = Number(info.record.increases?.[key] || 0) || 0; if (d > 0) declared[key] = d; }
  for (const key of Object.keys(info.record.increases || {})) if (!ABILITY_KEYS.includes(key) && Number(info.record.increases[key]) > 0) problems.push(`the record declares an unknown ability "${key}"`);
  const allowed = new Set(Object.keys(declared).map(k => `system.attributes.${k}.base`));
  for (const key of info.touched) if (!allowed.has(key)) problems.push(`the plan changes ${key}, which is not a declared increase`);
  for (const [ability, delta] of Object.entries(declared)) {
    const path = `system.attributes.${ability}.base`;
    if (!(path in (planSet || {}))) { problems.push(`the record declares ${ability.toUpperCase()} +${delta} but the plan has no ${ability} score mutation`); continue; }
    const current = Number(actor?.system?.attributes?.[ability]?.base);
    if (!Number.isFinite(current) || Number(planSet[path]) !== current + delta) problems.push(`${ability} would become ${planSet[path]}, not ${Number.isFinite(current) ? current + delta : '(unknown)'}`);
  }
  const tid = info.record.transactionId;
  const inHistory = (Array.isArray(planSet[ABILITY_HISTORY_KEY]) ? planSet[ABILITY_HISTORY_KEY] : []).filter(e => e?.transactionId === tid);
  if (inHistory.length !== 1) problems.push('the plan history does not carry this transaction exactly once');
  else if (!sameRecord(inHistory[0], info.record)) problems.push('the plan history record differs from the latest-event record');
  return problems;
}

/**
 * EVI-06: the history the plan will WRITE is [pre-existing records captured at compile time] + [this transaction's record]. The write replaces the
 * whole array, so any change another writer made to the pre-existing records after compilation (an edit, addition, withdrawal, supersession, removal,
 * or a changed verification block - at ANY level) would be silently destroyed. Separate the new record by its transaction id and require the rest to be
 * identical to the actor's CURRENT canonical history. Order is not data (the builder sorts by level), so the comparison is order-insensitive; content is exact.
 * @returns {string[]} problems (empty = the plan is not stale)
 */
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
};
/** Order-insensitive, multiplicity-sensitive equality of two history arrays (canonical content). Shared by the system Apply guard and the acknowledgment service. */
export function historiesMatch(a, b) {
  const left = (Array.isArray(a) ? a : []).map(canonical).sort();
  const right = (Array.isArray(b) ? b : []).map(canonical).sort();
  return left.length === right.length && left.every((x, i) => x === right[i]);
}

export function checkPlannedHistoryFresh(actor, planSet) {
  const info = describeAbilityTransaction(planSet);
  if (!info) return [];
  const planned = Array.isArray(planSet?.[ABILITY_HISTORY_KEY]) ? planSet[ABILITY_HISTORY_KEY] : [];
  const preExisting = planned.filter(entry => entry?.transactionId !== info.record.transactionId).map(canonical).sort();
  const currentRaw = actor?.system?.progression?.abilityIncreaseHistory;
  const current = (Array.isArray(currentRaw) ? currentRaw : []).map(canonical).sort();
  const problems = [];
  // EVI-06a: an exact, order-insensitive, MULTIPLICITY-sensitive comparison. Both lists are sorted canonical strings; the histories are equal only if
  // every record appears the same number of times (membership alone would treat [A, A, B] and [A, B, B] as the same).
  const tally = (list) => list.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const want = tally(preExisting); const have = tally(current);
  let missingNow = 0; let newerNow = 0;
  for (const key of new Set([...want.keys(), ...have.keys()])) {
    const w = want.get(key) || 0; const h = have.get(key) || 0;
    if (w > h) missingNow += w - h;   // the plan expects more copies than the actor has: edited, removed or duplicated-away since compilation
    if (h > w) newerNow += h - w;     // the actor has copies the plan would overwrite: added, edited or duplicated since compilation
  }
  if (missingNow) problems.push(`${missingNow} history record(s) the plan expects were changed or removed`);
  if (newerNow) problems.push(`${newerNow} newer history record(s) would be overwritten`);
  return problems;
}

const sameRecord = (a, b) => a?.entitlementId === b?.entitlementId && recordLevel(a) === recordLevel(b) && a?.transactionId === b?.transactionId
  && ABILITY_KEYS.every(k => (Number(a?.increases?.[k] || 0) || 0) === (Number(b?.increases?.[k] || 0) || 0));

export function beginAbilityIncreaseTransaction(actor, mutationPlan, { entitlementCheck = null, getAllocationMode = null } = {}) {
  const noop = () => {};
  const info = describeAbilityTransaction(mutationPlan?.set);
  if (!info) return { ok: true, release: noop, before: null };
  const refuse = (code, error) => ({ ok: false, code, error, release: noop });
  if (info.level === null) return refuse('INVALID_ENTITLEMENT_LEVEL', 'The ability-increase record has no valid level; nothing was changed.');
  if (!info.record.transactionId) return refuse('MISSING_TRANSACTION_ID', 'The ability-increase record has no transaction identity; nothing was changed.');
  // EVR-01: revalidate the COMPLETE entitlement contract at the final boundary, from the canonical authorities supplied by the caller - existence, the
  // CURRENT count, deferred status, and the CURRENT allocation rule - not only existence. A plan compiled under different rules is stale and is refused.
  if (typeof entitlementCheck !== 'function') return refuse('ENTITLEMENT_UNVALIDATED', `The level ${info.level} ability-increase entitlement could not be validated; nothing was changed.`);
  const entitlement = entitlementCheck(info.level) || {};
  if (!entitlement.exists) return refuse('ENTITLEMENT_NOT_FOUND', `No level ${info.level} ability-increase entitlement exists for this character${entitlement.reason ? ` (${entitlement.reason})` : ''}; nothing was changed.`);
  if (entitlement.rulesDeferred) return refuse('ENTITLEMENT_COUNT_DEFERRED', `The number of level ${info.level} ability increases is a pending rules question; nothing was changed.`);
  const currentCount = strictCount(entitlement.count);
  if (currentCount === null) return refuse('ENTITLEMENT_COUNT_UNKNOWN', `The number of level ${info.level} ability increases is not established; nothing was changed.`);
  if (info.record.entitledCount !== currentCount) return refuse('ENTITLEMENT_CHANGED', `The level ${info.level} entitlement changed since this was prepared (${info.record.entitledCount} -> ${currentCount}); review and try again. Nothing was changed.`);
  const mode = typeof getAllocationMode === 'function' ? getAllocationMode() : null;
  if (!mode) return refuse('ALLOCATION_RULE_UNKNOWN', 'The current ability-increase allocation rule could not be determined; nothing was changed.');
  if (info.record.allocationMode !== mode) return refuse('ALLOCATION_RULE_CHANGED', 'The ability-increase allocation rule changed since this was prepared; review and try again. Nothing was changed.');
  try { validateAbilitySelection(info.record.increases, { maxPerAbility: mode === 'allow_stacked_two' ? 2 : 1, entitledCount: currentCount }); }
  catch (error) { return refuse(error.code || 'INVALID_SELECTION', error.message); }
  const key = `${actor?.id}:${info.level}`;
  if (inFlight.has(key)) return refuse('APPLICATION_IN_PROGRESS', `The level ${info.level} ability increase is already being applied; nothing was changed.`);
  const history = actor?.system?.progression?.abilityIncreaseHistory;
  if (recordsForLevel(history, info.level).length) return refuse('ENTITLEMENT_ALREADY_RECORDED', `The level ${info.level} ability increase was recorded since this was prepared; applying it again would increase the scores twice. Nothing was changed.`);
  // EVI-06: the plan REPLACES the history array; refuse a stale plan rather than overwrite (or merge) newer evidence at any level.
  const staleHistory = checkPlannedHistoryFresh(actor, mutationPlan.set);
  if (staleHistory.length) return refuse('HISTORY_CHANGED', `The ability-increase history changed since this was prepared (${staleHistory.join('; ')}); review the character and try again. Nothing was changed.`);
  for (const [ability, { delta, next }] of Object.entries(info.bases)) {
    const current = Number(actor?.system?.attributes?.[ability]?.base);
    if (current !== next - delta) return refuse('SCORES_CHANGED', `The ${ability.toUpperCase()} score changed since this was prepared; review the character and try again. Nothing was changed.`);
  }
  // EVR-02: the plan must be exactly what the record says it is (declared increase <-> score mutation, no stray ability mutation, history == latest event).
  const problems = checkPlanEvidenceEquivalence(actor, mutationPlan.set);
  if (problems.length) return refuse('PLAN_EVIDENCE_MISMATCH', `The mutation plan does not match its own ability-increase record (${problems.join('; ')}); nothing was changed.`);
  // snapshot of ALL six permanent bases immediately before the commit: lets verification prove each declared increase is exactly before + delta and that nothing else moved.
  const before = Object.fromEntries(ABILITY_KEYS.map(k => [k, Number(actor?.system?.attributes?.[k]?.base)]));
  inFlight.add(key);
  return { ok: true, release: () => inFlight.delete(key), before };
}

/**
 * Post-commit verification (Checkpoint C). Called ONLY after ActorEngine reported success. It compares the plan's intended effect with what the
 * actor now actually holds: every increased score equals the planned value, and the canonical history contains the planned record for the entitlement.
 * A failed check yields state 'failed' (never 'verified'). Pure; the caller persists the block.
 * @returns {{state:'verified'|'failed', verifiedAt:string, sessionId:string|null, checks:{scores:boolean, record:boolean}, reasons:string[]}|null} null when the plan carried no ability increase
 */
export function verifyAbilityIncreaseCommit(actor, mutationPlan, { before = null, now = new Date().toISOString() } = {}) {
  const info = describeAbilityTransaction(mutationPlan?.set);
  if (!info || info.level === null) return null;
  const reasons = [];
  // 1. EVERY permanent base, against the verified PRE-COMMIT snapshot: a declared increase is exactly before + delta; every other score is exactly before.
  //    (The plan's own numbers are not the basis, so a plan that omitted or altered a mutation cannot verify itself.)
  let scores = true;
  for (const ability of ABILITY_KEYS) {
    const delta = Number(info.record.increases?.[ability] || 0) || 0;
    const base = before ? before[ability] : null;
    if (base === null || !Number.isFinite(base)) { scores = false; reasons.push(`${ability}: no pre-commit basis to verify`); continue; }
    const expected = base + delta;
    if (Number(actor?.system?.attributes?.[ability]?.base) !== expected) { scores = false; reasons.push(`${ability} is not ${expected}`); }
  }
  // 2. the history holds THIS transaction (unique id) exactly as planned, once.
  const tid = info.record.transactionId;
  const matches = (Array.isArray(actor?.system?.progression?.abilityIncreaseHistory) ? actor.system.progression.abilityIncreaseHistory : []).filter(entry => entry?.transactionId === tid);
  const record = matches.length === 1 && sameRecord(matches[0], info.record);
  if (!record) reasons.push(matches.length > 1 ? 'the transaction appears more than once in the history' : 'the history record is not present as planned');
  // 3. the latest-event record is the SAME transaction with the same entitlement and selections (not only the same id).
  const last = actor?.system?.progression?.lastAbilityIncrease;
  const latest = !!last && sameRecord(last, info.record);
  if (!latest) reasons.push('lastAbilityIncrease is not this exact transaction');
  const sessionId = mutationPlan?.set?.['system.progression.completedSessionId'] ?? null;
  return { state: scores && record && latest ? 'verified' : 'failed', transactionId: tid, verifiedAt: now, sessionId, checks: { scores, record, latest }, reasons };
}

export default { historiesMatch, validateSelectionShape, checkPlannedHistoryFresh, validateAbilitySelection, checkPlanEvidenceEquivalence, strictCount, newTransactionId, resolveEntitlementLevel, assertEntitlementOpen, beginAbilityIncreaseTransaction, strictLevel, entitlementIdForLevel, levelFromEntitlementId };
