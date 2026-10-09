// Phase 5D-I-C-A -- pure builders for the outcome effects a canonical weapon attack leaves on its target.
// This module decides WHAT an effect is (status effect data with provenance and a turn lifecycle, a PoisonEngine definition); it never mutates,
// rolls or posts. Execution stays with the existing systems: ActorEngine.createActiveEffects (status / timed effects, EffectIntentEngine
// lifecycle), PoisonEngine (persistent secondary-attack toxins), RecurringDamageEngine (delayed damage), the Apply Damage pipeline.
// Every input is a STRUCTURED field of the canonical schema (enumerated status ids, duration owner/through, defense keys) -- never a weapon
// name, a description, or chat text.

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const camel = (s) => String(s ?? '').trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
const kebab = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const STATUS_ICONS = Object.freeze({
  prone: 'icons/svg/falling.svg', immobilized: 'icons/svg/net.svg', blinded: 'icons/svg/blind.svg',
  'total-concealment-against-bearer': 'icons/svg/invisible.svg', disintegrated: 'icons/svg/skull.svg', 'skill-penalty': 'icons/svg/downgrade.svg', 'speed-set': 'icons/svg/downgrade.svg',
});
/** statuses that are Foundry status ids (the Prone / Immobilized / Blinded condition effects the system already registers) */
const STATUS_IDS = Object.freeze(new Set(['prone', 'immobilized', 'blinded']));

/**
 * Lifecycle plan of a structured duration.
 *   { owner:'target'|'attacker', through:'end-of-next-turn'|'start-of-next-turn' } -> turn-owned lifecycle ("until the end of its / the attacker's next turn")
 *   { dice:'1d4', unit:'rounds' } with `rolledRounds` -> "N-rounds"
 *   none -> until deactivated (e.g. Prone lasts until the target stands)
 */
export function durationPlan(duration, { rolledRounds = null, attackerId = null, targetId = null } = {}) {
  if (!duration) return { key: 'until-deactivated', turnOwnerActorId: null, phase: null };
  if (duration.owner && duration.through) {
    const owner = duration.owner === 'attacker' ? attackerId : duration.owner === 'target' ? targetId : null;
    if (!owner) return { key: null, reason: 'turn-owner-unobserved' };
    const phase = duration.through === 'start-of-next-turn' ? 'start' : duration.through === 'end-of-next-turn' ? 'end' : null;
    if (!phase) return { key: null, reason: 'unsupported-duration' };
    return { key: phase === 'start' ? 'until-start-next-turn' : 'until-end-next-turn', turnOwnerActorId: String(owner), phase };
  }
  if (duration.dice && duration.unit === 'rounds') {
    const n = Number(rolledRounds);
    if (!Number.isFinite(n) || n < 1) return { key: null, reason: 'duration-not-rolled' };
    return { key: `${Math.floor(n)}-rounds`, turnOwnerActorId: null, phase: null };
  }
  return { key: null, reason: 'unsupported-duration' };
}

/**
 * ActiveEffect data for a status / timed effect.
 * @param {{status:string, duration?:object, skillPenalty?:{skill:string, amount:number}, speedSetSquares?:number}} payload  the record payload
 * @param {{label:string, source?:object, recordKey:string, messageId?:string, attackerId?:string, targetId?:string, attackerUuid?:string,
 *          currentSpeed?:number, rolledRounds?:number}} ctx
 * @returns {{ok:true, data:object, plan:object}|{ok:false, reason:string}}
 */
export function statusEffectData(payload, ctx = {}) {
  const status = String(payload?.status ?? '');
  if (!STATUS_ICONS[status]) return { ok: false, reason: 'unsupported-status' };
  const plan = durationPlan(payload.duration, { rolledRounds: ctx.rolledRounds, attackerId: ctx.attackerId, targetId: ctx.targetId });
  if (!plan.key) return { ok: false, reason: plan.reason };

  const intent = { version: 1, mode: 'basic', application: 'always', activeState: 'enabled', scope: 'self', transfer: false, duration: plan.key, filterType: 'all', filterValue: '', conditions: [], note: ctx.label ?? '' };
  if (status === 'skill-penalty') {
    const amount = Math.abs(Number(payload.skillPenalty?.amount));
    const skill = kebab(payload.skillPenalty?.skill);
    if (!skill || !Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'unsupported-skill-penalty' };
    Object.assign(intent, { operation: 'decrease', category: 'skill', target: skill, amount, bonusType: 'penalty' });
  } else if (status === 'speed-set') {
    const squares = Number(payload.speedSetSquares);
    const current = Number(ctx.currentSpeed);
    if (!Number.isFinite(squares) || !Number.isFinite(current)) return { ok: false, reason: 'speed-unobserved' };
    // "speed is reduced to N squares": a penalty equal to the difference against the speed observed when the effect is created (never raises speed)
    const delta = Math.max(0, current - squares);
    if (delta === 0) return { ok: false, reason: 'speed-already-at-or-below' };
    Object.assign(intent, { operation: 'decrease', category: 'speed', target: 'base', amount: delta, bonusType: 'penalty' });
  } else {
    // a condition: the status id is the effect; the intent carries the lifecycle only (condition intents have no numeric modifier target)
    Object.assign(intent, { operation: 'increase', category: 'condition', target: ['total-concealment-against-bearer', 'disintegrated'].includes(status) ? 'custom-status' : status, amount: 1, bonusType: 'untyped' });
  }

  const weaponEffect = {
    recordKey: ctx.recordKey, family: 'status-effect', status,
    ...(ctx.source ? { source: ctx.source } : {}),
    ...(ctx.messageId ? { messageId: ctx.messageId } : {}),
    attackerActorId: ctx.attackerId ?? null, targetActorId: ctx.targetId ?? null,
    duration: plan.key, ...(plan.turnOwnerActorId ? { turnOwnerActorId: plan.turnOwnerActorId, phase: plan.phase } : {}),
  };
  const data = {
    name: ctx.label ?? status,
    icon: STATUS_ICONS[status],
    origin: ctx.attackerUuid ?? null,
    disabled: false,
    transfer: false,
    ...(STATUS_IDS.has(status) ? { statuses: [status] } : {}),
    changes: [],
    flags: {
      swse: { effectType: 'condition', condition: status },
      'foundryvtt-swse': { effectIntent: intent, weaponEffect },
    },
  };
  return { ok: true, data, plan };
}

/** Does the actor already carry THIS record's effect (idempotency independent of the chat receipt)? */
export function hasWeaponEffect(actor, recordKey) {
  return Array.from(actor?.effects ?? []).some((e) => (e?.flags?.['foundryvtt-swse']?.weaponEffect?.recordKey ?? null) === recordKey && e?.disabled !== true);
}

/**
 * PoisonEngine definition of a canonical `persistent-secondary-attack` effect (Neural Inhibitor). Structured fields only: the secondary attack's
 * defense and roll formula, the success / failure condition-track results, the cure skill + DC, the termination conditions. A field the corpus does not
 * carry makes the effect unbuildable (never invented).
 * @returns {{ok:true, definition:object}|{ok:false, reason:string}}
 */
export function poisonDefinitionFromPersistentEffect(effect, { key, name, source = null } = {}) {
  const sec = effect?.initialSecondaryAttack;
  const bonus = /^1d20\s*\+\s*(\d+)$/.exec(String(sec?.roll ?? ''));
  const success = effect?.onSecondaryAttackSuccess;
  const failure = effect?.onSecondaryAttackFailure ?? {};
  const cure = effect?.cure;
  if (!sec?.defense || !bonus || !Number.isFinite(Number(success?.conditionTrackSteps)) || !cure?.skill || !Number.isFinite(Number(cure?.dc)) || effect?.recurrence?.timing !== 'beginning-of-target-turn') {
    return { ok: false, reason: 'persistent-effect-structure-incomplete' };
  }
  const terminations = asArray(effect.termination).map((t) => t?.condition);
  return {
    ok: true,
    definition: {
      key, name, source: source ?? 'Canonical weapon',
      delivery: ['injected'], keywords: ['poison', 'weapon-delivered'],
      trigger: String(effect.trigger ?? ''),
      attack: { bonus: Number(bonus[1]), defense: String(sec.defense), ignores: [] },
      damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: Math.abs(Number(success.conditionTrackSteps)), persistent: effect.persistentCondition === true, onMissSteps: Math.abs(Number(failure.conditionTrackSteps) || 0) } },
      recurrence: { type: 'startOfTurnUntilTreated', until: ['treated'] },
      treatment: { skill: camel(cure.skill), dc: Number(cure.dc), requiresMedicalKit: false },
      special: {
        onFailure: { continues: effect.persistentCondition === true, attackBonusIncrement: Number(failure.nextAttackBonusIncrement) || 0, cumulative: failure.cumulative === true },
        endsWhenTargetUnconscious: terminations.includes('target-falls-unconscious'),
      },
    },
  };
}

/** Delayed-damage spec for RecurringDamageEngine (one instance at the start of the target's next turn). */
export function delayedDamageSpec(payload, { id, label, source = null, attackerId = null, weaponId = null, workflowId = null } = {}) {
  if (payload?.timing !== 'start-of-target-next-turn' || typeof payload.formula !== 'string') return { ok: false, reason: 'unsupported-delayed-damage' };
  const qualifier = asArray(payload.qualifiers)[0] ?? 'untyped';
  return {
    ok: true,
    spec: {
      id, key: kebab(`${payload.qualifiers?.[0] ?? 'delayed'}-${id}`), name: label, sourceName: label, formula: payload.formula, damageType: qualifier,
      trigger: 'startOfTurn', remainingTriggers: 1, duration: 'next turn of the target',
      sourceActorId: attackerId, sourceItemId: weaponId, workflowId,
      tags: ['weapon-effect', ...(source?.identityKey ? [source.identityKey] : [])],
      ...(source ? { weaponSource: source } : {}),
    },
  };
}
