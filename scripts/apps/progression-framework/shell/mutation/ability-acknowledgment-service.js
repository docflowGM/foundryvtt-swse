/**
 * Manual completion acknowledgments for ability-score increases (Checkpoint D).
 *
 * A player (or GM) states that a historical ability-increase entitlement was already applied BY HAND. The statement is stored in the existing canonical
 * history (`system.progression.abilityIncreaseHistory`) as a record that is explicitly NOT a system transaction (`source: 'manual-attestation'`,
 * `appliedBySystem: false`, no transaction id, no verification). Acknowledging NEVER changes an ability score, HP, a derived statistic, or `lastAbilityIncrease`.
 * The Progression Evidence Reader remains the only interpreter of these records; this module only validates and writes them, through ActorEngine.
 *
 * Operations: acknowledge (full or partial, repeatable), correct, withdraw, supersede (GM). Nothing is ever deleted: a corrected / superseded / withdrawn
 * record stays in the history with an inactive status and a reference to its replacement, and an inactive record never counts toward completion.
 *
 * Everything the service must NOT decide is injected so it owns no rules: `entitlementCheck(level)` (existence, count, deferred status - the canonical authorities),
 * `getAllocationMode()` (the house rule), `canModify(actor, user)` and the ActorEngine. A missing dependency fails closed.
 *
 * Foundry gives actor owners document-edit rights, so these records are provenance statements for review, not tamper-proof security. Writes replace the
 * history array; Foundry has no compare-and-set, so the stale-history comparison narrows - it does not eliminate - the cross-client race.
 */
import { ABILITY_HISTORY_KEY, AbilityIncreaseError, strictCount, strictLevel, entitlementIdForLevel, recordLevel, validateSelectionShape, historiesMatch } from './ability-increase-guard.js';
import { getAbilityIncreaseCompletion, classifyAbilityIncreaseRecord, MANUAL_ATTESTATION_SOURCE } from '../reconciliation/progression-completion-reader.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const inFlight = new Set();
export const _resetAcknowledgmentService = () => inFlight.clear();

const newId = () => `ack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const refuse = (code, message) => ({ status: 'refused', code, message: `${message}${/nothing was changed/.test(message) ? '' : '; nothing was changed.'}` });
const fail = (code, message) => { throw new AbilityIncreaseError(code, message); };
const sum = (sel) => Object.values(sel || {}).reduce((n, d) => n + d, 0);
const clone = (value) => structuredClone(value);
const sortByLevel = (history) => [...history].sort((a, b) => (recordLevel(a) || 0) - (recordLevel(b) || 0));

function defaultCanModify(actor, user) {
  if (user?.isGM === true) return true;
  return typeof actor?.canUserModify === 'function' ? actor.canUserModify(user, 'update') === true : false; // fail closed when permission cannot be established
}

function readHistory(actor) {
  const raw = actor?.system?.progression?.abilityIncreaseHistory;
  return Array.isArray(raw) ? raw : [];
}

/** Resolve the entitlement contract for a level from the injected canonical authorities. Throws a coded refusal. */
function contractFor(level, deps) {
  if (typeof deps?.entitlementCheck !== 'function') fail('ENTITLEMENT_UNVALIDATED', `The level ${level} ability-increase entitlement could not be validated; nothing was changed.`);
  const entitlement = deps.entitlementCheck(level) || {};
  if (!entitlement.exists) fail('ENTITLEMENT_NOT_FOUND', `No level ${level} ability-increase entitlement exists for this character${entitlement.reason ? ` (${entitlement.reason})` : ''}; nothing was changed.`);
  if (entitlement.rulesDeferred) fail('ENTITLEMENT_COUNT_DEFERRED', `The number of level ${level} ability increases is a pending rules question, so it cannot be acknowledged; nothing was changed.`);
  const count = strictCount(entitlement.count);
  if (count === null) fail('ENTITLEMENT_COUNT_UNKNOWN', `The number of level ${level} ability increases is not established; nothing was changed.`);
  const mode = typeof deps.getAllocationMode === 'function' ? deps.getAllocationMode() : null;
  if (!mode) fail('ALLOCATION_RULE_UNKNOWN', 'The ability-increase allocation rule could not be determined; nothing was changed.');
  return { count, mode, cap: mode === 'allow_stacked_two' ? 2 : 1 };
}

/** What the reader currently counts for the level (system + active manual), computed on a view of the history so a record can be treated as inactive. */
function countedView(actor, history, level, contract) {
  const shadow = { system: { progression: { ...(actor?.system?.progression || {}), abilityIncreaseHistory: history } } };
  const completion = getAbilityIncreaseCompletion(shadow, level, { expectedCount: contract.count, rulesDeferred: false, maxPerAbility: contract.cap });
  const combined = {};
  for (const sel of [completion.applied, completion.gmAuthorized, completion.attested]) for (const [k, d] of Object.entries(sel || {})) combined[k] = (combined[k] || 0) + d;
  return { completion, combined, total: sum(combined) };
}

/** A new selection must fit the remaining capacity under the allocation rule: no ability above the cap once existing evidence is counted, no total above the count. */
function assertFits(selection, view, contract, level) {
  if (view.completion.applied && sum(view.completion.applied) >= contract.count) fail('ALREADY_SATISFIED', `The level ${level} ability increase is already complete in the system record; nothing was changed.`);
  for (const [k, d] of Object.entries(selection)) {
    if ((view.combined[k] || 0) + d > contract.cap) fail('OVERLAPPING_CLAIM', `${k.toUpperCase()} is already accounted for at level ${level}; a second claim would count it twice. Nothing was changed.`);
  }
  if (view.total + sum(selection) > contract.count) fail('EXCEEDS_ENTITLEMENT', `Level ${level} grants ${contract.count} increase(s); ${view.total} are already accounted for, so ${sum(selection)} more would exceed it. Nothing was changed.`);
}

function manualTarget(history, acknowledgmentId) {
  const target = history.find(entry => entry?.acknowledgmentId === acknowledgmentId);
  if (!target) fail('ACKNOWLEDGMENT_NOT_FOUND', 'That acknowledgment was not found; nothing was changed.');
  const kind = classifyAbilityIncreaseRecord(target).kind;
  if (kind === 'inactive') fail('NOT_ACTIVE', 'That acknowledgment is no longer active (withdrawn or superseded); it cannot be changed again. Nothing was changed.');
  if (kind !== 'player-attested' && kind !== 'gm-authorized') fail('NOT_A_MANUAL_RECORD', 'Only a manual acknowledgment can be changed here; system-applied records are never modified. Nothing was changed.');
  return { target, kind };
}

function assertMayChange(target, kind, user, actor, canModify, { gmOnly = false } = {}) {
  if (gmOnly) { if (user?.isGM !== true) fail('NOT_AUTHORIZED', 'Only a GM can supersede an acknowledgment; nothing was changed.'); return; }
  if (user?.isGM === true) return;
  const author = target.attestedBy && target.attestedBy === user?.id;
  if (kind === 'gm-authorized' || !author || !canModify(actor, user)) fail('NOT_AUTHORIZED', 'Only the player who made this statement (while they can modify the character) or a GM can change it; nothing was changed.');
}

async function commit(actor, level, deps, plan) {
  const engine = deps?.engine;
  if (typeof engine?.updateActor !== 'function') return refuse('ENGINE_UNAVAILABLE', 'ActorEngine is unavailable');
  const key = `${actor?.id}:${level}`;
  if (inFlight.has(key)) return refuse('OPERATION_IN_PROGRESS', 'Another acknowledgment for this level is being saved');
  inFlight.add(key);
  try {
    const history = clone(readHistory(actor));
    const contract = contractFor(level, deps);
    const built = plan({ history, contract });
    if (built.unchanged) return { status: 'unchanged', code: built.code || 'UNCHANGED', message: built.message || 'Nothing to change.', record: built.record ?? null };
    // Revalidate IMMEDIATELY before the mutation: same contract, same history (order-insensitive, multiplicity-sensitive), same permissions.
    const again = contractFor(level, deps);
    if (again.count !== contract.count || again.mode !== contract.mode) fail('ENTITLEMENT_CHANGED', 'The entitlement or the allocation rule changed while this was being prepared; nothing was changed.');
    if (!historiesMatch(readHistory(actor), history)) fail('HISTORY_CHANGED', 'The ability-increase history changed while this was being prepared; review the character and try again. Nothing was changed.');
    // ACK-01: a call that returned (or threw) is a REQUEST, not proof. The outcome is established by re-reading the canonical history. A potentially
    // committed write is never retried; an unconfirmed one is reported as indeterminate. No second ledger: the same history is the evidence.
    const before = history;
    let engineResult; let engineError = null;
    try {
      engineResult = await engine.updateActor(actor, { [ABILITY_HISTORY_KEY]: sortByLevel(built.next) }, { source: `AbilityAcknowledgmentService.${built.operation}`, meta: { guardKey: 'ability-acknowledgment' } });
    } catch (error) { engineError = error; }
    const after = readHistory(actor);
    const persisted = historiesMatch(after, built.next);
    const unchanged = historiesMatch(after, before);
    const intended = persisted && built.record && after.some(e => e?.acknowledgmentId === built.record.acknowledgmentId);
    if (!engineError && engineResult?.prevented !== true && persisted && intended) return { status: 'ok', code: 'OK', operation: built.operation, record: built.record, message: built.message };
    if (unchanged && engineResult?.prevented === true) return { status: 'refused', code: 'UPDATE_PREVENTED', operation: built.operation, record: null, message: 'The update was prevented by the system; nothing was changed.' };
    if (unchanged && engineError) return { status: 'refused', code: 'ENGINE_ERROR', operation: built.operation, record: null, message: `The update failed (${engineError.message || 'error'}) and the history appears unchanged. Review Progress before trying again.` };
    return {
      status: 'indeterminate', code: 'WRITE_NOT_CONFIRMED', operation: built.operation, record: null,
      message: unchanged ? 'The update was reported but the saved history does not show it. It was NOT retried; reopen Review Progress to see the current state before trying again.'
        : 'The saved history is not what was intended (it may have changed, or only partly saved). It was NOT retried; reopen Review Progress to see the current state before trying again.',
    };
  } catch (error) {
    if (error instanceof AbilityIncreaseError) return refuse(error.code, error.message);
    throw error;
  } finally {
    inFlight.delete(key);
  }
}

const baseRecord = (level, contract, user, evidence, extra = {}) => ({
  level, characterLevel: level, entitlementId: entitlementIdForLevel(level),
  acknowledgmentId: newId(), source: MANUAL_ATTESTATION_SOURCE, evidence, appliedBySystem: false,
  attestedBy: user.id, attestedByName: user.name ?? null, timestamp: new Date().toISOString(), status: 'active',
  entitledCount: contract.count, allocationMode: contract.mode, ...extra,
});

export const AbilityAcknowledgmentService = {
  /** Create a full or partial acknowledgment; repeat to add the remainder. Player statements need modify permission; `origin: 'gm'` needs a GM. */
  async acknowledge(actor, { level, increases, user, origin = 'player', deps = {} } = {}) {
    const canModify = deps.canModify || defaultCanModify;
    const L = strictLevel(level);
    if (!L) return refuse('INVALID_ENTITLEMENT_LEVEL', 'The entitlement level is invalid');
    if (!user?.id) return refuse('NOT_AUTHORIZED', 'Nobody is identified as making this statement');
    if (origin === 'gm' ? user.isGM !== true : !canModify(actor, user)) return refuse('NOT_AUTHORIZED', 'You are not allowed to record this statement');
    return commit(actor, L, deps, ({ history, contract }) => {
      const { increases: selection, total } = validateSelectionShape(increases, { maxPerAbility: contract.cap });
      if (total < 1) fail('EMPTY_SELECTION', 'Select at least one ability increase; nothing was changed.');
      const evidence = origin === 'gm' ? 'gm-authorized' : 'player-confirmed';
      const same = history.find(e => classifyAbilityIncreaseRecord(e).kind === (origin === 'gm' ? 'gm-authorized' : 'player-attested')
        && recordLevel(e) === L && e.attestedBy === user.id && JSON.stringify(Object.entries(e.increases || {}).sort()) === JSON.stringify(Object.entries(selection).sort()));
      if (same) return { unchanged: true, code: 'ALREADY_ACKNOWLEDGED', message: 'This acknowledgment is already recorded.', record: same };
      assertFits(selection, countedView(actor, history, L, contract), contract, L);
      const record = baseRecord(L, contract, user, evidence, { increases: selection });
      return { operation: 'acknowledge', next: [...history, record], record, message: total < contract.count ? 'Recorded as a partial acknowledgment. No ability score was changed.' : 'Recorded. No ability score was changed.' };
    });
  },

  /** Replace the SELECTION of an active acknowledgment. The original stays in the history as superseded (correctionOf / supersededBy link them). */
  async correct(actor, { acknowledgmentId, increases, user, deps = {} } = {}) {
    return replace(actor, { acknowledgmentId, increases, user, deps, kind: 'correction', gmOnly: false });
  },

  /** GM only: replace an active acknowledgment with a GM-authorized one. Only the intended record is deactivated; unrelated acknowledgments keep counting. */
  async supersede(actor, { acknowledgmentId, increases, user, deps = {} } = {}) {
    return replace(actor, { acknowledgmentId, increases, user, deps, kind: 'gm-supersession', gmOnly: true });
  },

  /** Mark an active acknowledgment withdrawn (author while they can modify the actor, or a GM). It is kept, inactive, and never counts. Idempotent. */
  async withdraw(actor, { acknowledgmentId, user, deps = {} } = {}) {
    const canModify = deps.canModify || defaultCanModify;
    if (!user?.id) return refuse('NOT_AUTHORIZED', 'Nobody is identified as making this change');
    const found = readHistory(actor).find(e => e?.acknowledgmentId === acknowledgmentId);
    if (!found) return refuse('ACKNOWLEDGMENT_NOT_FOUND', 'That acknowledgment was not found');
    if (String(found.status || '').toLowerCase() === 'withdrawn') return { status: 'unchanged', code: 'ALREADY_WITHDRAWN', message: 'Already withdrawn.', record: found };
    const L = recordLevel(found);
    return commit(actor, L, deps, ({ history }) => {
      const { target, kind } = manualTarget(history, acknowledgmentId);
      assertMayChange(target, kind, user, actor, canModify);
      const updated = { ...target, status: 'withdrawn', withdrawnBy: user.id, withdrawnByName: user.name ?? null, withdrawnAt: new Date().toISOString() };
      return { operation: 'withdraw', next: history.map(e => (e === target ? updated : e)), record: updated, message: 'Withdrawn. The statement is kept in the history but no longer counts.' };
    });
  },
};

async function replace(actor, { acknowledgmentId, increases, user, deps, kind, gmOnly }) {
  const canModify = deps.canModify || defaultCanModify;
  if (!user?.id) return refuse('NOT_AUTHORIZED', 'Nobody is identified as making this change');
  const found = readHistory(actor).find(e => e?.acknowledgmentId === acknowledgmentId);
  if (!found) return refuse('ACKNOWLEDGMENT_NOT_FOUND', 'That acknowledgment was not found');
  const L = recordLevel(found);
  return commit(actor, L, deps, ({ history, contract }) => {
    const { target, kind: targetKind } = manualTarget(history, acknowledgmentId);
    assertMayChange(target, targetKind, user, actor, canModify, { gmOnly });
    const { increases: selection, total } = validateSelectionShape(increases, { maxPerAbility: contract.cap });
    if (total < 1) fail('EMPTY_SELECTION', 'Select at least one ability increase (use withdraw to remove a statement); nothing was changed.');
    if (JSON.stringify(Object.entries(target.increases || {}).sort()) === JSON.stringify(Object.entries(selection).sort()) && (user.isGM !== true || targetKind === 'gm-authorized')) {
      return { unchanged: true, code: 'NO_CHANGE', message: 'The selection is unchanged.', record: target };
    }
    // capacity is computed as if the target were already inactive
    const without = history.map(e => (e === target ? { ...e, status: 'superseded' } : e));
    assertFits(selection, countedView(actor, without, L, contract), contract, L);
    const evidence = user.isGM === true ? 'gm-authorized' : 'player-confirmed';
    const replacement = baseRecord(L, contract, user, evidence, { increases: selection, [kind === 'correction' ? 'correctionOf' : 'supersedes']: target.acknowledgmentId });
    const superseded = { ...target, status: 'superseded', supersededBy: replacement.acknowledgmentId, supersededByUser: user.id, supersededAt: replacement.timestamp, supersessionKind: kind };
    return { operation: kind === 'correction' ? 'correct' : 'supersede', next: history.map(e => (e === target ? superseded : e)).concat([replacement]), record: replacement, message: 'Recorded. The previous statement is kept in the history as superseded.' };
  });
}

export default AbilityAcknowledgmentService;
