// Phase 5D-E -- Apply-Damage-time execution of the special effects the canonical runtime selected for an attack.
// This is NOT an effect engine: it only decides WHETHER a record that was evaluated at attack time still applies once damage is
// applied (damage actually dealt, overwhelming stun threshold) and then hands the shift to the existing
// CombatTargetEffectAdapter -> ActorEngine.setConditionStep path. Receipts make each effect apply once per message + target.
import { CombatTargetEffectAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-target-effect-adapter.js";
import { askSpecialQuestion } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js";

const RECEIPT_FLAG = 'specialEffectReceipts';
const ANSWER_FLAG = 'specialAnswers';

export const specialReceiptKey = (recordId, targetId) => `${recordId}:${targetId ?? 'selected'}`;

function readFlag(message, name) {
  try { return message?.getFlag?.('swse', name) ?? null; } catch (_err) { return null; }
}

export function findSpecialReceipt(message, key) {
  const receipts = readFlag(message, RECEIPT_FLAG);
  return Array.isArray(receipts) ? receipts.find((r) => r?.key === key) ?? null : null;
}

async function recordSpecialReceipt(message, key, receipt) {
  try {
    const existing = readFlag(message, RECEIPT_FLAG);
    await message?.setFlag?.('swse', RECEIPT_FLAG, [...(Array.isArray(existing) ? existing : []), { key, ...receipt }]);
  } catch (err) {
    console.warn('[SWSE Chat] Failed to record special-effect receipt (effect was still applied).', err);
  }
}

/** Stored PROMPT answer for this message (workflow answers first, then answers given at Apply time). Never re-asked. */
function storedAnswer(message, special, id) {
  if (special?.answers && (special.answers[id] === true || special.answers[id] === false)) return special.answers[id];
  const stored = readFlag(message, ANSWER_FLAG);
  return stored && (stored[id] === true || stored[id] === false) ? stored[id] : undefined;
}

async function rememberAnswer(message, id, value) {
  try {
    const stored = readFlag(message, ANSWER_FLAG) ?? {};
    await message?.setFlag?.('swse', ANSWER_FLAG, { ...stored, [id]: value });
  } catch (_err) { /* best effort: the effect still resolves this once */ }
}

/**
 * @param {object} p
 * @param {object} p.special       workflowContext.special (records evaluated at attack time)
 * @param {Actor}  p.target        target actor the damage was applied to
 * @param {Actor}  [p.attacker]
 * @param {number} p.hpBefore      target HP before the packet was applied
 * @param {number} p.hpAfter       target HP after
 * @param {number} p.rawAmount     pre-mitigation damage amount of this card
 * @param {ChatMessage} p.message  damage chat message (receipt + answer store)
 * @returns {Promise<{applied:Array, skipped:Array}>}
 */
export async function applyCanonicalSpecialEffects({ special, target, attacker = null, hpBefore, hpAfter, rawAmount, message, weaponLabel = 'Weapon' } = {}) {
  const applied = [], skipped = [];
  if (!target || !Array.isArray(special?.records)) return { applied, skipped };
  const damageDealt = Number.isFinite(hpBefore) && Number.isFinite(hpAfter) ? hpBefore - hpAfter : null;
  for (const rec of special.records) {
    const key = specialReceiptKey(rec.id, target.id);
    if (findSpecialReceipt(message, key)) { skipped.push({ id: rec.id, reason: 'already-applied' }); continue; }
    let fire = rec.fired === true ? true : rec.fired === false ? false : null;
    if (fire === null) {
      const prior = storedAnswer(message, special, rec.id);
      if (prior === true || prior === false) fire = prior;
      else {
        const ans = await askSpecialQuestion({ id: rec.id, family: rec.kind === 'ct-rider' ? 'ct-rider-prompt' : rec.kind, question: `${weaponLabel}: does the ${rec.id} effect apply to ${target.name ?? 'the target'}? (${rec.trigger ?? 'condition not observable'})` });
        if (ans === true || ans === false) { fire = ans; await rememberAnswer(message, rec.id, ans); }
      }
    }
    if (fire !== true) { skipped.push({ id: rec.id, reason: fire === false ? 'trigger-not-met' : 'unresolved' }); continue; }
    if (rec.kind === 'overwhelming-stun') {
      if (!(Number.isFinite(rawAmount) && Number.isFinite(hpBefore) && rawAmount >= hpBefore)) { skipped.push({ id: rec.id, reason: 'threshold-not-met' }); continue; }
    } else if (rec.requiresDamage && !(damageDealt !== null && damageDealt > 0)) {
      skipped.push({ id: rec.id, reason: 'no-damage-dealt' }); continue;
    }
    const result = await CombatTargetEffectAdapter.applyFromAttackResult({ isHit: true, isCritical: false }, {
      attacker, targetActor: target, sourceName: `${weaponLabel} (${rec.id})`,
      effects: [{ type: 'move-target-condition-track', steps: rec.steps, direction: rec.direction ?? 'down', persistent: rec.persistent === true, label: `${weaponLabel} (${rec.id})` }]
    });
    await recordSpecialReceipt(message, key, { id: rec.id, targetId: target.id ?? null, steps: rec.steps, appliedAt: Date.now(), applied: result.applied?.length > 0 });
    applied.push({ id: rec.id, steps: rec.steps, result });
  }
  return { applied, skipped };
}
