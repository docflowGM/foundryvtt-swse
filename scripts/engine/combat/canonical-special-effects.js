// Phase 5D-E -- Apply-Damage-time execution of the special effects the canonical runtime selected for an attack.
// This is NOT an effect engine: it only decides WHETHER a record that was evaluated at attack time still applies once damage is
// applied (damage actually dealt, overwhelming stun threshold) and then hands the shift to the existing
// CombatTargetEffectAdapter -> ActorEngine.setConditionStep path. Receipts make each effect apply once per message + target.
//
// Phase 5D-I-C-A adds the outcome kinds, each delegated to the system that already owns that behaviour:
//   status-effect        ActorEngine.createActiveEffects (+ EffectIntentEngine lifecycle, turn-owned expiry)
//   bonus-damage         ActorEngine.applyDamage (a separate immediate damage event: full mitigation, no riders of its own)
//   delayed-damage       RecurringDamageEngine (one instance at the start of the target's next turn)
//   persistent-poison    PoisonEngine (instance, recurrence, treatment, termination)
//   poison-delivery      PoisonEngine.applyWeaponPoisonFromAttack (only a poison SELECTED on the owned weapon, only when damage is dealt)
//   zero-hp-ct-disable   CombatTargetEffectAdapter (condition track) + droid disabled state
// Order at Apply Damage (deterministic): damage packet -> mitigation -> HP -> threshold -> condition-track movement (ActorEngine.applyDamage), THEN
// these riders in record order. Riders read the resolved damage event (`resolution`); none of them re-enters this function.
import { CombatTargetEffectAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-target-effect-adapter.js";
import { askSpecialQuestion } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { getDamageTargetCategory, getEvasionState } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-rules.js";
import { statusEffectData, hasWeaponEffect, poisonDefinitionFromPersistentEffect, delayedDamageSpec } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/outcome-effects.js";

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

const kebab = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
async function rollTotal(formula) {
  const r = await RollEngine.safeRoll(String(formula));
  return Math.max(0, Number(r?.total) || 0);
}

/** true / false / null: does the record's apply-time condition (read from the resolved damage event) hold? */
function applyConditionMet(rec, { resolution, damageDealt }) {
  if (!rec.applyCondition) return true;
  if (!resolution) return null; // the damage event was not handed to the rider stage: never guessed
  const moved = Number(resolution.conditionDelta) || 0;
  if (rec.applyCondition === 'target-moved-down-condition-track') return moved > 0;
  if (rec.applyCondition === 'threshold-exceeded-and-condition-track-moved') {
    return resolution.thresholdExceeded === true && moved >= Math.max(1, Number(rec.payload?.minimumConditionSteps) || 1) && (damageDealt === null || damageDealt > 0);
  }
  if (rec.applyCondition === 'target-killed-or-destroyed') return resolution.dead === true || resolution.destroyed === true;
  return null;
}

/** Immunity named by a record: structural where the actor shows it (an existing Blinded status), otherwise asked ONCE and stored. */
async function immunityOf(rec, { target, message, special, weaponLabel }) {
  const imm = rec.payload?.immunity;
  if (!imm) return false;
  if (imm === 'blind-creatures' && (target?.statuses?.has?.('blinded') || Array.from(target?.effects ?? []).some((e) => e?.statuses?.has?.('blinded') && e?.disabled !== true))) return true;
  const id = `immunity:${imm}:${target?.id ?? 'selected'}`;
  const stored = storedAnswer(message, special, id);
  if (stored === true || stored === false) return stored;
  const ans = await askSpecialQuestion({ id, family: 'status-effect', question: `${weaponLabel}: is ${target?.name ?? 'the target'} immune (${imm.replace(/-/g, ' ')})?` });
  if (ans === true || ans === false) { await rememberAnswer(message, id, ans); return ans; }
  return null;
}

function electronicClass(rec, { target, special, message }) {
  const category = getDamageTargetCategory(target);
  if ((rec.payload?.categories ?? []).includes(category)) return true;
  if (category !== 'organic') return false;
  const id = `target-class:cybernetic:${target?.id ?? ''}`;
  const ans = storedAnswer(message, special, id);
  return ans === true ? true : ans === false ? false : null;
}

async function applyStatusEffect(rec, ctx) {
  const { target, attacker, message, weaponLabel } = ctx;
  const recordKey = specialReceiptKey(rec.id, target.id);
  if (hasWeaponEffect(target, recordKey)) return { applied: false, reason: 'effect-already-present' };
  const payload = rec.payload ?? {};
  const rolledRounds = payload.duration?.dice ? await rollTotal(payload.duration.dice) : null;
  const speed = Number(target?.system?.derived?.speed?.total);
  const built = statusEffectData(payload, {
    label: `${weaponLabel} (${rec.id})`, source: rec.source, recordKey, messageId: message?.id ?? null,
    attackerId: attacker?.id ?? null, targetId: target.id, attackerUuid: attacker?.uuid ?? null,
    currentSpeed: Number.isFinite(speed) ? speed : undefined, rolledRounds,
  });
  if (!built.ok) return { applied: false, reason: built.reason };
  const { EffectIntentEngine } = await import('/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js');
  const data = EffectIntentEngine.stampLifecycle(built.data, { actor: target, turnOwnerActorId: built.plan.turnOwnerActorId ?? null, phase: built.plan.phase ?? null });
  const created = await ActorEngine.createActiveEffects(target, [data], { source: 'weapon-outcome-effect' });
  return { applied: Array.isArray(created) ? created.length > 0 : !!created, effectIds: (created ?? []).map((e) => e?.id).filter(Boolean), duration: built.plan.key };
}

/**
 * @param {object} p
 * @param {object} p.special       workflowContext.special (records evaluated at attack time)
 * @param {Actor}  p.target        target actor the damage was applied to
 * @param {Actor}  [p.attacker]
 * @param {number} p.hpBefore      target HP before the packet was applied
 * @param {number} p.hpAfter       target HP after
 * @param {number} p.rawAmount     pre-mitigation damage amount of this card
 * @param {number} [p.appliedAmount]  the amount actually sent to the target after target rules (class / Evasion / miss), before HP halving
 * @param {object} [p.resolution]  ActorEngine.applyDamage -> DamageResolutionEngine result of the damage event just applied (threshold / CT facts)
 * @param {Item}   [p.weapon]      the attacking weapon (poison coating, provenance)
 * @param {string} [p.damageType]  damage type of the triggering damage (a bonus-damage rider deals the same type)
 * @param {ChatMessage} p.message  damage chat message (receipt + answer store)
 * @returns {Promise<{applied:Array, skipped:Array}>}
 */
export async function applyCanonicalSpecialEffects({ special, target, attacker = null, hpBefore, hpAfter, rawAmount, appliedAmount = null, resolution = null, weapon = null, damageType = null, message, weaponLabel = 'Weapon' } = {}) {
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
    // apply-time condition (read from the resolved damage event): threshold exceeded / condition track moved by THIS damage
    const cond = applyConditionMet(rec, { resolution, damageDealt });
    if (cond !== true) { skipped.push({ id: rec.id, reason: cond === false ? 'condition-not-met' : 'damage-event-unavailable' }); continue; }
    const imm = rec.kind === 'status-effect' || rec.kind === 'ct-rider' ? await immunityOf(rec, { target, message, special, weaponLabel }) : false;
    if (imm !== false) { skipped.push({ id: rec.id, reason: imm === true ? 'immune' : 'unresolved' }); continue; }

    let result = null, steps = rec.steps;
    if (rec.kind === 'ct-rider' || rec.kind === 'overwhelming-stun') {
      // Evasion lowers a condition-track shift that the weapon states with an Evasion value (Gas Grenade: -2, or -1 with Evasion)
      if (Number.isFinite(rec.payload?.evasionSteps) && getEvasionState(target).evasion) steps = rec.payload.evasionSteps;
      result = await CombatTargetEffectAdapter.applyFromAttackResult({ isHit: true, isCritical: false }, {
        attacker, targetActor: target, sourceName: `${weaponLabel} (${rec.id})`,
        effects: [{ type: 'move-target-condition-track', steps, direction: rec.direction ?? 'down', persistent: rec.persistent === true, label: `${weaponLabel} (${rec.id})` }]
      });
    } else if (rec.kind === 'zero-hp-ct-disable') {
      const electronic = electronicClass(rec, { target, special, message });
      const before = Number.isFinite(Number(appliedAmount)) ? Number(appliedAmount) : rawAmount;
      if (electronic === null) { skipped.push({ id: rec.id, reason: 'unresolved' }); continue; }
      if (electronic !== true || !(Number.isFinite(before) && Number.isFinite(hpBefore) && before >= hpBefore)) { skipped.push({ id: rec.id, reason: electronic ? 'threshold-not-met' : 'not-electronic-class' }); continue; }
      result = await CombatTargetEffectAdapter.applyFromAttackResult({ isHit: true, isCritical: false }, {
        attacker, targetActor: target, sourceName: `${weaponLabel} (${rec.id})`,
        effects: [{ type: 'move-target-condition-track', steps: rec.steps, direction: 'down', label: `${weaponLabel} (${rec.id})` }]
      });
      if (rec.payload?.disabled === true && target.type === 'droid' && resolution?.destroyed !== true) {
        await ActorEngine.updateActor(target, { 'system.droidState.status': 'disabled', 'system.droidState.disabled': true, 'system.droidState.destroyed': false, 'system.droidState.canBeRepaired': true });
        result.disabled = true;
      }
    } else if (rec.kind === 'status-effect') {
      result = await applyStatusEffect(rec, { target, attacker, message, weaponLabel });
      if (!result.applied) { skipped.push({ id: rec.id, reason: result.reason ?? 'not-applied' }); continue; }
    } else if (rec.kind === 'bonus-damage') {
      const total = await rollTotal(rec.payload?.formula);
      const type = damageType ?? 'normal';
      const dmg = await ActorEngine.applyDamage(target, { amount: total, type, source: `${weaponLabel} (${rec.id})`, sourceActor: attacker, options: { weapon, damageType: type, outcomeRider: rec.id, recordKey: key } });
      result = { rolled: total, applied: dmg?.applied ?? null, resolution: dmg?.resolution ?? null };
    } else if (rec.kind === 'delayed-damage') {
      const built = delayedDamageSpec(rec.payload, { id: `${message?.id ?? 'msg'}:${rec.id}:${target.id}`, label: `${weaponLabel} (${rec.id})`, source: rec.source ?? null, attackerId: attacker?.id ?? null, weaponId: weapon?.id ?? null, workflowId: special?.workflowId ?? null });
      if (!built.ok) { skipped.push({ id: rec.id, reason: built.reason }); continue; }
      const { RecurringDamageEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/recurring-damage-engine.js');
      result = await RecurringDamageEngine.queueRecurringDamage(target, built.spec, { sourceActor: attacker, sourceItem: weapon, notify: true });
      if (!result?.success) { skipped.push({ id: rec.id, reason: result?.reason ?? 'not-queued' }); continue; }
    } else if (rec.kind === 'persistent-poison') {
      const built = poisonDefinitionFromPersistentEffect(rec.payload?.effect, { key: kebab(`${rec.source?.identityKey ?? 'weapon'}-${rec.id}`), name: `${weaponLabel} (${rec.id})`, source: rec.source?.identityKey ?? null });
      if (!built.ok) { skipped.push({ id: rec.id, reason: built.reason }); continue; }
      const { PoisonEngine } = await import('/systems/foundryvtt-swse/scripts/engine/poison/poison-engine.js');
      result = await PoisonEngine.applyPoison({ sourceActor: attacker, targetActor: target, poisonDefinition: built.definition, delivery: 'injected', sourceItem: weapon, immediate: true });
      if (result?.blocked || result?.success === false && !result?.instance) { skipped.push({ id: rec.id, reason: result?.reason ?? 'poison-blocked' }); continue; }
    } else if (rec.kind === 'weapon-control') {
      // Phase 5D-I-C-B: weapon control (grab / grapple / restrain / net / snare / tractor / entitled Pin or Trip). Executed through the existing grapple
      // state machine by weapon-control-effects; the optional choices are asked once and stored with the other answers.
      const { applyWeaponControlRecord } = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-control-effects.js');
      const out = await applyWeaponControlRecord(rec, {
        target, attacker, weapon, message, weaponLabel, special, rangeBand: special?.rangeBand ?? null,
        ask: async (id, question) => {
          const prior = storedAnswer(message, special, id);
          if (prior === true || prior === false) return prior;
          const ans = await askSpecialQuestion({ id, family: 'grab-grapple', question });
          if (ans === true || ans === false) { await rememberAnswer(message, id, ans); return ans; }
          return null;
        },
        bonusFor: async (actor, w) => { const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js'); return (await computeFinalAttackComposition(actor, w, {}))?.atkBonus; },
        grappleBonusFor: async (actor) => { const { SWSEGrappling } = await import('/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'); return SWSEGrappling._rollGrappleBonus(actor, { mode: 'resistGrapple' }); },
        proficientWith: async (actor, w, profileId) => {
          try {
            const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
            const runtime = rt.resolveAttackWeaponRuntime(w, { profileId });
            return rt.resolveCanonicalAttackProficiency(runtime, actor).proficient === true;
          } catch (_err) { return false; }
        },
      });
      if (!out.applied) { skipped.push({ id: rec.id, reason: out.reason ?? 'not-applied' }); continue; }
      result = out.result;
    } else if (rec.kind === 'poison-delivery') {
      const { PoisonEngine } = await import('/systems/foundryvtt-swse/scripts/engine/poison/poison-engine.js');
      result = await PoisonEngine.applyWeaponPoisonFromAttack({ attacker, target, weapon, damage: damageDealt ?? 0, attackTotal: special?.attackTotal ?? null });
      if (!result) { skipped.push({ id: rec.id, reason: 'no-poison-selected-or-no-damage' }); continue; }
    } else {
      skipped.push({ id: rec.id, reason: 'unsupported-record-kind' }); continue;
    }
    await recordSpecialReceipt(message, key, { id: rec.id, kind: rec.kind, targetId: target.id ?? null, steps, ...(rec.source ? { source: rec.source } : {}), appliedAt: Date.now(), applied: result?.applied?.length > 0 || result?.applied === true || result?.success === true || rec.kind !== 'ct-rider' });
    applied.push({ id: rec.id, kind: rec.kind, steps, result });
  }
  return { applied, skipped };
}

/**
 * Phase 5D-I-C-A: the one target fact the runtime cannot observe for a weapon with structured `targetRules` (EMP Grenade): is an ORGANIC target
 * cybernetically enhanced? Asked ONCE per message + target and stored with the other answers; an unanswered fact leaves the damage refused (the
 * packet rule reports `targetClassUnresolved`), never guessed. Droids / vehicles / devices / objects are classified structurally and never asked.
 * @returns {Promise<object>} the (possibly answer-extended) special state
 */
export async function resolveTargetClassFacts({ special, target, message, weaponLabel = 'Weapon' } = {}) {
  if (!special?.targetRules || !target || getDamageTargetCategory(target) !== 'organic') return special;
  const id = `target-class:cybernetic:${target.id}`;
  let ans = storedAnswer(message, special, id);
  if (ans !== true && ans !== false) {
    ans = await askSpecialQuestion({ id, family: 'target-class-damage', question: `${weaponLabel}: is ${target.name ?? 'the target'} a cybernetically enhanced creature? (it takes this weapon's full ion damage)` });
    if (ans === true || ans === false) await rememberAnswer(message, id, ans);
  }
  return ans === true || ans === false ? { ...special, answers: { ...(special.answers ?? {}), [id]: ans } } : special;
}

/**
 * Phase 5D-I-C-A: an EFFECT-ONLY attack form (Venom Spit, Flash Canister, Flash Rocket) has no damage roll. Its card action applies the outcome
 * effects through the same records, receipts, immunity prompts and engines as Apply Damage -- with no HP change, so only effects that do not require
 * damage can fire.
 */
export async function applyEffectOnlyOutcome({ special, target, attacker = null, weapon = null, message, weaponLabel = 'Weapon' } = {}) {
  const hp = Number(target?.system?.hp?.value);
  return applyCanonicalSpecialEffects({ special, target, attacker, weapon, message, weaponLabel, hpBefore: hp, hpAfter: hp, rawAmount: 0, appliedAmount: 0, resolution: null });
}
