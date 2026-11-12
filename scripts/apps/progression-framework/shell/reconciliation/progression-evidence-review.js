/**
 * Progression history review (Checkpoint E): the display model for the "Review Progress" section of Character Review.
 *
 * PURE and READ-ONLY. It never computes a completion verdict itself: every row is the reconciler's own ability-increase slot (which already holds the
 * canonical reader's classification) plus the raw history records for that level, so the page can show who said what. It adds nothing to the header `!`
 * (findings are built elsewhere and never from this model), and "Ignore" is not consulted: ignoring a finding is never completion evidence.
 *
 * Display states (owner Part VII): System verified / Manually acknowledged / Partially acknowledged / Not verified / Confirmed mechanical discrepancy.
 */
import { COMPLETION, classifyAbilityIncreaseRecord } from './progression-completion-reader.js';
import { recordLevel } from '../mutation/ability-increase-guard.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const LABEL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

export const EVIDENCE_STATE = Object.freeze({
  SYSTEM_VERIFIED: 'system-verified',
  MANUAL: 'manually-acknowledged',
  PARTIAL: 'partially-acknowledged',
  NOT_VERIFIED: 'not-verified',
  DISCREPANCY: 'confirmed-discrepancy',
});

const STATE_TEXT = Object.freeze({
  [EVIDENCE_STATE.SYSTEM_VERIFIED]: 'System verified',
  [EVIDENCE_STATE.MANUAL]: 'Manually acknowledged',
  [EVIDENCE_STATE.PARTIAL]: 'Partially acknowledged',
  [EVIDENCE_STATE.NOT_VERIFIED]: 'Not verified',
  [EVIDENCE_STATE.DISCREPANCY]: 'Confirmed mechanical discrepancy',
});

/** Map the reader's classification to one of the five display states. */
export function evidenceStateFor(classification) {
  switch (classification) {
    case COMPLETION.SYSTEM_VERIFIED: return EVIDENCE_STATE.SYSTEM_VERIFIED;
    // A system-committed record that was never post-commit verified is shown as what it is: recorded by the system, not verified.
    case COMPLETION.SYSTEM_COMMITTED_UNVERIFIED: return EVIDENCE_STATE.NOT_VERIFIED;
    case COMPLETION.PLAYER_ATTESTED:
    case COMPLETION.GM_AUTHORIZED: return EVIDENCE_STATE.MANUAL;
    case COMPLETION.PARTIAL: return EVIDENCE_STATE.PARTIAL;
    case COMPLETION.CONFIRMED_DISCREPANCY: return EVIDENCE_STATE.DISCREPANCY;
    default: return EVIDENCE_STATE.NOT_VERIFIED;
  }
}

const describeSelection = (sel) => ABILITY_KEYS.filter(k => Number(sel?.[k]) > 0).map(k => `${LABEL[k]} +${sel[k]}`).join(', ') || 'none';

function recordRow(entry, { user, actor }) {
  const kind = classifyAbilityIncreaseRecord(entry).kind;
  const manual = kind === 'player-attested' || kind === 'gm-authorized';
  const inactive = kind === 'inactive';
  const isGM = user?.isGM === true;
  const author = !!entry.attestedBy && entry.attestedBy === user?.id;
  const canEditActor = isGM || (typeof actor?.canUserModify === 'function' && actor.canUserModify(user, 'update') === true);
  const mayChange = manual && (isGM || (kind === 'player-attested' && author && canEditActor));
  const who = entry.attestedByName || entry.attestedBy || null;
  const sourceText = kind === 'player-attested' ? `Player statement${who ? ` (${who})` : ''}`
    : kind === 'gm-authorized' ? `GM-authorized acknowledgment${who ? ` (${who})` : ''} - a recorded statement, not verification`
      : kind === 'system-verified' ? 'Applied and verified by the system'
        : kind === 'system-committed' ? 'Applied by the system (not post-commit verified)'
          : inactive ? `${String(entry.status).charAt(0).toUpperCase()}${String(entry.status).slice(1)}`
            : 'Unrecognized record (shown, not counted)';
  return {
    acknowledgmentId: manual || inactive ? (entry.acknowledgmentId ?? null) : null,
    kind, manual, inactive,
    sourceText,
    selectionText: describeSelection(entry.increases || entry.abilityIncreases),
    when: entry.timestamp ?? entry.attestedAt ?? null,
    status: entry.status ?? null,
    note: inactive
      ? [entry.supersededBy ? `replaced by ${entry.supersededBy}` : null, entry.withdrawnByName || entry.withdrawnBy ? `withdrawn by ${entry.withdrawnByName || entry.withdrawnBy}` : null].filter(Boolean).join('; ') || null
      : null,
    // UI hints only: ActorEngine-side service re-checks every permission, so this never grants anything.
    canWithdraw: mayChange && !inactive,
    canCorrect: mayChange && !inactive,
    canSupersede: isGM && manual && !inactive,
  };
}

/**
 * @param {object} report the (memoized) reconciliation report ({slots:{abilityIncreases}})
 * @param {Actor} actor
 * @param {{user?:User}} [ctx]
 */
export function buildProgressReview(report, actor, { user = null } = {}) {
  const slots = Array.isArray(report?.slots?.abilityIncreases) ? report.slots.abilityIncreases : [];
  const history = Array.isArray(actor?.system?.progression?.abilityIncreaseHistory) ? actor.system.progression.abilityIncreaseHistory : [];
  const rows = slots.map(slot => {
    const level = Number(slot.characterLevel) || null;
    const classification = slot.completion?.classification ?? COMPLETION.UNVERIFIABLE;
    const state = evidenceStateFor(classification);
    const deferred = !!slot.completion?.rulesDeferred && (Array.isArray(slot.completion.rulesDeferred) ? slot.completion.rulesDeferred.length > 0 : true);
    const records = history.filter(e => recordLevel(e) === level).map(e => recordRow(e, { user, actor }));
    const hasAnyRecord = records.length > 0;
    const complete = state === EVIDENCE_STATE.SYSTEM_VERIFIED || state === EVIDENCE_STATE.MANUAL || (classification === COMPLETION.SYSTEM_COMMITTED_UNVERIFIED);
    const remaining = Math.max(0, (Number(slot.count) || 0) - (Number(slot.filledCount) || 0));
    return {
      id: slot.id, level, label: slot.label || `Level ${level} Ability Increase`,
      entitledCount: Number(slot.count) || 0, filledCount: Number(slot.filledCount) || 0, remaining,
      state, stateText: STATE_TEXT[state], classification,
      counts: { system: slot.completion?.appliedCount ?? 0, player: slot.completion?.attestedCount ?? 0, gm: slot.completion?.gmAuthorizedCount ?? 0 },
      mixed: slot.completion?.mixed === true,
      rulesDeferred: deferred,
      summary: deferred ? 'Entitlement count pending rules review. Nothing here can be acknowledged or applied until that rule is decided.'
        : state === EVIDENCE_STATE.SYSTEM_VERIFIED ? 'Applied and verified by the progression system.'
          : state === EVIDENCE_STATE.MANUAL ? 'Acknowledged as already applied. No ability score was changed by the acknowledgment.'
            : state === EVIDENCE_STATE.PARTIAL ? `${slot.filledCount} of ${slot.count} acknowledged; the remainder is not verified.`
              : 'No verified record of this entitlement. This is not an error; the increase may have been applied by hand.',
      records,
      // "Already Applied" records a statement (never a score change). "Apply Increases" uses the progression authority and only when nothing is on record
      // for the level (the guard blocks additive Apply once any record exists).
      canAcknowledge: !deferred && remaining > 0 && state !== EVIDENCE_STATE.SYSTEM_VERIFIED && !complete,
      canApply: !deferred && !hasAnyRecord && remaining > 0,
      expectedLabel: deferred ? 'Entitlement count pending rules review' : `${slot.count} increase${slot.count === 1 ? '' : 's'}`,
    };
  });
  return { rows, hasRows: rows.length > 0, isGM: user?.isGM === true };
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Focused confirmation dialog body. Shows the exact entitlement, lets the player pick any valid (including partial) selection, states plainly that no
 * ability score changes, and requires an explicit confirmation checkbox. `initial` pre-fills a correction.
 */
export function buildAcknowledgmentDialogContent({ label, entitledCount, remaining, cap = 1, initial = {}, mode = 'acknowledge', gm = false } = {}) {
  const inputs = ABILITY_KEYS.map(k => `<label class="swse-ack-ability">${LABEL[k]} <input type="number" name="ability-${k}" min="0" max="${Math.max(1, Number(cap) || 1)}" step="1" value="${Number(initial?.[k]) > 0 ? Number(initial[k]) : 0}"></label>`).join(' ');
  const verb = mode === 'withdraw' ? 'withdraw' : mode === 'correct' ? 'correct' : mode === 'supersede' ? 'supersede' : 'acknowledge';
  return `<form class="swse-ack-form">
    <p><strong>${esc(label)}</strong>: this level grants <strong>${esc(entitledCount)}</strong> ability increase${Number(entitledCount) === 1 ? '' : 's'}${remaining !== undefined && remaining !== null ? `; ${esc(remaining)} not yet accounted for` : ''}.</p>
    <p>Enter the increase${Number(entitledCount) === 1 ? '' : 's'} you already applied by hand. You may enter fewer than the full amount (a partial acknowledgment); the rest stays "not verified".</p>
    <div class="swse-ack-abilities">${inputs}</div>
    ${gm ? '<p><em>As a GM this is recorded as a <strong>GM-authorized acknowledgment</strong>: your statement that the increase was already applied. It does not prove that any particular change was made.</em></p>' : ''}
    <p><em>This only records your statement. <strong>No ability score, HP, or other statistic will be changed.</strong></em></p>
    <label class="swse-ack-confirm"><input type="checkbox" name="confirm-${verb}" value="1"> I confirm this is accurate and I want to ${verb} it.</label>
  </form>`;
}

function rootOf(html) {
  const el = html?.[0] ?? html;
  return el && typeof el.querySelector === 'function' ? el : null;
}

/**
 * Read the dialog result, fail closed (UI-01). All six fields must be present and be whole numbers >= 0; an intentional 0 is allowed. Anything else
 * (blank, missing, unreadable, fractional, negative, non-numeric) is reported in `invalid` and the caller must refuse - a bad field is never dropped
 * to leave a smaller "valid" selection. Over-cap/over-entitlement amounts are still judged by the service.
 * @returns {{confirmed:boolean, increases:object, invalid:string[]}}
 */
export function readAcknowledgmentDialog(html) {
  const root = rootOf(html);
  if (!root) return { confirmed: false, increases: {}, invalid: ['dialog'] };
  const confirmed = !!root.querySelector('input[type="checkbox"][name^="confirm-"]')?.checked;
  const increases = {}; const invalid = [];
  for (const k of ABILITY_KEYS) {
    const el = root.querySelector(`input[name="ability-${k}"]`);
    const raw = el?.value;
    const text = typeof raw === 'string' ? raw.trim() : (typeof raw === 'number' ? String(raw) : '');
    if (!el || text === '' || !/^\d+$/.test(text)) { invalid.push(k); continue; }
    const n = Number(text);
    if (!Number.isSafeInteger(n)) { invalid.push(k); continue; }
    if (n > 0) increases[k] = n;
  }
  return { confirmed, increases, invalid };
}

export default { EVIDENCE_STATE, evidenceStateFor, buildProgressReview, buildAcknowledgmentDialogContent, readAcknowledgmentDialog };
