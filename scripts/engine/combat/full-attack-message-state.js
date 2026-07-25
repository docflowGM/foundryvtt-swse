/**
 * full-attack-message-state.js — the single authority for reading and
 * writing a combined Full Attack chat card's `flags.swse` state (Phase 5
 * rolling-system alignment).
 *
 * This is a "narrowly scoped attack-message state service" (per the Phase 5
 * brief), not a second roll engine or a second AttackOutcomeResolver — it
 * contains no dice execution and no hit/critical logic. It only owns:
 *   - the schema shape for a combined-card message's per-attack revision
 *     history,
 *   - validating an expected-revision before mutating (stale-card/
 *     concurrency protection),
 *   - appending a new revision and marking the previous one superseded,
 *   - recording/checking damage-application receipts per attack instance.
 *
 * Callers (full-attack-executor.js at creation time,
 * meta-resource-feat-resolver.js's full-attack reroll handler,
 * chat-interaction-bridge.js's damage handlers) all go through this module
 * rather than calling `message.update()` directly for sequence state, so
 * there is exactly one place that understands the schema.
 */

export const FULL_ATTACK_SCHEMA_VERSION = 'full-attack-v2';

/**
 * Build the initial (revision 0) entry for one attack in a newly-declared
 * sequence. Pure data — no dice execution, no outcome interpretation; the
 * caller supplies an already-resolved rollAttack() result.
 *
 * @param {Object} params
 * @returns {Object} attack entry, `{revisions: [revision 0]}`.
 */
export function buildInitialAttackEntry({
  attackInstanceId,
  order,
  weaponUuid,
  weaponName,
  targetUuid,
  targetName,
  label,
  penaltyText,
  rollInstanceId,
  naturalD20,
  total,
  formula,
  outcome,
  componentLedger,
  damageContext,
  attackRerollOptions
}) {
  return {
    attackInstanceId,
    order,
    weaponUuid: weaponUuid ?? null,
    weaponName: weaponName ?? null,
    targetUuid: targetUuid ?? null,
    targetName: targetName ?? null,
    label: label ?? `Attack ${Number(order ?? 0) + 1}`,
    penaltyText: penaltyText ?? '',
    activeRevision: 0,
    // attackRerollOptions is a serializable array (id/label/cost/outcome/
    // formula/etc, exactly what rollAttack() already builds via
    // MetaResourceFeatResolver.buildAttackRerollChatOptions for the
    // single-attack path) — stored once here so the combined card can
    // render an eligible reroll button per attack without re-deriving
    // eligibility from scratch.
    attackRerollOptions: Array.isArray(attackRerollOptions) ? attackRerollOptions : [],
    revisions: [
      {
        revision: 0,
        rollInstanceId: rollInstanceId ?? null,
        authoritative: true,
        superseded: false,
        supersededBy: null,
        rollResult: { naturalD20: naturalD20 ?? null, total: total ?? null, formula: formula ?? null },
        outcome: outcome ?? null,
        componentLedger: Array.isArray(componentLedger) ? componentLedger : [],
        transactions: {},
        rerollSource: null,
        resultPolicy: null,
        damageContext: damageContext ?? null,
        createdAt: Date.now()
      }
    ],
    damageApplications: []
  };
}

/**
 * Read the current stored attacks array for a combined-card message,
 * normalizing a legacy Phase 4 (`full-attack-v1`, flat per-attack shape
 * with no `revisions[]`) message in memory only — never writes anything
 * back for a legacy message. Old, genuinely unsupported messages (no
 * `flags.swse.fullAttack`) return `null`.
 *
 * @param {ChatMessage} message
 * @returns {Array<Object>|null}
 */
export function readAttacksArray(message) {
  const flags = message?.flags?.swse ?? {};
  if (flags.fullAttack !== true) return null;
  const attacks = Array.isArray(flags.attacks) ? flags.attacks : [];
  return attacks.map(entry => normalizeAttackEntry(entry));
}

/**
 * Normalize one attack entry to the current (`full-attack-v2`) shape.
 * A Phase 4 entry (`{attackInstanceId, sequenceIndex, activeRevision,
 * authoritative, superseded, weaponId, naturalD20, finalTotal, isHit,
 * isCritical, critMultiplier}`, no `revisions[]`) is wrapped into a
 * synthetic single-revision entry — read-only normalization, not a write.
 */
export function normalizeAttackEntry(entry) {
  if (!entry) return entry;
  if (Array.isArray(entry.revisions)) return entry; // already v2
  return {
    attackInstanceId: entry.attackInstanceId ?? null,
    order: entry.sequenceIndex ?? 0,
    weaponUuid: entry.weaponId ?? null,
    weaponName: null,
    targetUuid: null,
    targetName: null,
    label: `Attack ${Number(entry.sequenceIndex ?? 0) + 1}`,
    penaltyText: '',
    activeRevision: 0,
    attackRerollOptions: [],
    revisions: [
      {
        revision: 0,
        rollInstanceId: null,
        authoritative: entry.authoritative !== false,
        superseded: entry.superseded === true,
        supersededBy: null,
        rollResult: { naturalD20: entry.naturalD20 ?? null, total: entry.finalTotal ?? null, formula: null },
        outcome: { hit: entry.isHit ?? null, critical: entry.isCritical ?? null, critMultiplier: entry.critMultiplier ?? null },
        componentLedger: [],
        transactions: {},
        rerollSource: null,
        resultPolicy: null,
        damageContext: null,
        createdAt: null
      }
    ],
    damageApplications: [],
    _legacySchema: 'full-attack-v1'
  };
}

/**
 * @param {ChatMessage} message
 * @param {string} attackInstanceId
 * @returns {Object|null}
 */
export function getAttackEntry(message, attackInstanceId) {
  const attacks = readAttacksArray(message);
  if (!attacks) return null;
  return attacks.find(a => a?.attackInstanceId === attackInstanceId) ?? null;
}

/**
 * @param {Object} entry
 * @returns {Object|null} the currently-active revision object.
 */
export function getActiveRevision(entry) {
  if (!entry) return null;
  return entry.revisions?.find(r => r.revision === entry.activeRevision) ?? null;
}

/**
 * Append a new revision to one attack in a combined-card message, iff the
 * message's CURRENTLY STORED active revision for that attack still matches
 * `expectedRevision` (stale-card / concurrency protection — re-reads the
 * message fresh rather than trusting a caller-held copy). Marks the
 * previous revision superseded, sets the new one authoritative, and
 * persists the whole `attacks` array in a single `message.update()` call.
 *
 * @param {ChatMessage} message
 * @param {string} attackInstanceId
 * @param {number} expectedRevision
 * @param {Object} revisionData - fields for the new revision (rollInstanceId, rollResult, outcome, componentLedger, transactions, rerollSource, resultPolicy, damageContext).
 * @param {Object} [renderOptions] - `{content}` — if provided, the message's `content` is updated in the same write.
 * @returns {Promise<{ok: boolean, conflict?: string, entry?: Object, revision?: number}>}
 */
export async function appendRevision(message, attackInstanceId, expectedRevision, revisionData, renderOptions = {}) {
  const attacks = readAttacksArray(message);
  if (!attacks) return { ok: false, conflict: 'not-a-full-attack-message' };
  const index = attacks.findIndex(a => a?.attackInstanceId === attackInstanceId);
  if (index < 0) return { ok: false, conflict: 'attack-not-found' };

  const entry = attacks[index];
  if (entry.activeRevision !== expectedRevision) {
    return { ok: false, conflict: 'stale-revision', entry };
  }

  const previousRevisionIndex = entry.revisions.findIndex(r => r.revision === expectedRevision);
  const newRevisionNumber = expectedRevision + 1;

  const updatedRevisions = entry.revisions.map((r, i) =>
    i === previousRevisionIndex ? { ...r, authoritative: false, superseded: true, supersededBy: newRevisionNumber } : r
  );
  updatedRevisions.push({
    revision: newRevisionNumber,
    rollInstanceId: revisionData.rollInstanceId ?? null,
    authoritative: true,
    superseded: false,
    supersededBy: null,
    rollResult: revisionData.rollResult ?? null,
    outcome: revisionData.outcome ?? null,
    componentLedger: Array.isArray(revisionData.componentLedger) ? revisionData.componentLedger : [],
    transactions: revisionData.transactions ?? {},
    rerollSource: revisionData.rerollSource ?? null,
    resultPolicy: revisionData.resultPolicy ?? null,
    damageContext: revisionData.damageContext ?? null,
    createdAt: Date.now()
  });

  const updatedEntry = { ...entry, activeRevision: newRevisionNumber, revisions: updatedRevisions };
  const updatedAttacks = attacks.map((a, i) => (i === index ? updatedEntry : a));

  const updatePayload = { 'flags.swse.attacks': updatedAttacks };
  if (typeof renderOptions.content === 'string') updatePayload.content = renderOptions.content;
  await message.update(updatePayload);

  return { ok: true, entry: updatedEntry, revision: newRevisionNumber };
}

/**
 * Duplicate-damage-application protection for one attack instance's
 * currently-active revision (mirrors chat-interaction-bridge.js's
 * single-attack damage receipt, scoped per attackInstanceId+revision so a
 * reroll that creates a new revision does not inherit an older revision's
 * "already applied" state).
 */
export function damageApplicationReceiptKey(activeRevision, targetId) {
  return `${activeRevision}:${targetId || 'selected'}`;
}

export function findDamageApplicationReceipt(entry, key) {
  return Array.isArray(entry?.damageApplications) ? entry.damageApplications.find(r => r?.key === key) ?? null : null;
}

/**
 * Record a damage-application receipt for one attack instance, re-reading
 * the message fresh (same stale-safety posture as appendRevision).
 */
export async function recordDamageApplication(message, attackInstanceId, receipt) {
  const attacks = readAttacksArray(message);
  if (!attacks) return { ok: false, conflict: 'not-a-full-attack-message' };
  const index = attacks.findIndex(a => a?.attackInstanceId === attackInstanceId);
  if (index < 0) return { ok: false, conflict: 'attack-not-found' };
  const entry = attacks[index];
  const receipts = Array.isArray(entry.damageApplications) ? entry.damageApplications : [];
  const updatedEntry = { ...entry, damageApplications: [...receipts, receipt] };
  const updatedAttacks = attacks.map((a, i) => (i === index ? updatedEntry : a));
  await message.update({ 'flags.swse.attacks': updatedAttacks });
  return { ok: true };
}
