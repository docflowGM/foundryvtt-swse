import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { getHeroicLevel, getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function getAttackOptionRules(item) {
  const rules = item?.system?.abilityMeta?.attackOptionRules;
  return Array.isArray(rules) ? rules : [];
}

function collectRules(actor, predicate) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    for (const rule of getAttackOptionRules(item)) {
      if (predicate(rule)) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return rules;
}

function collectDamageRiders(actor) {
  return collectRules(actor, rule => rule?.type === 'CONDITIONAL_DAMAGE_RIDER');
}

function collectAttackComboRules(actor) {
  return collectRules(actor, rule => rule?.type === 'ATTACK_COMBO_SEQUENCE');
}

function weaponAttackType(weapon, context = {}) {
  const explicit = context.attackType
    ?? context.workflowContext?.attack?.attackType
    ?? context.workflowContext?.attackType
    ?? context.combatContext?.attack?.attackType
    ?? context.damage?.attackType;
  if (explicit) return normalizeKey(explicit);

  const system = weapon?.system ?? {};
  const candidates = [
    system.attackType,
    system.weaponType,
    system.category,
    system.type,
    system.rangeType,
    system.range?.type,
    system.weapon?.type,
    system.weapon?.category
  ].map(normalizeKey).filter(Boolean);

  if (candidates.some(value => ['melee', 'unarmed', 'lightsaber'].includes(value))) return 'melee';
  if (candidates.some(value => ['ranged', 'thrown', 'grenade', 'grenadelike'].includes(value))) return 'ranged';
  if (system.range || system.rangeIncrement || system.rangeCategory) return 'ranged';
  return 'unknown';
}

function targetIdFromContext(context = {}) {
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? null;
  return target?.id
    ?? target?._id
    ?? context.targetId
    ?? context.targetActorId
    ?? context.workflowContext?.targetId
    ?? context.workflowContext?.targetActorId
    ?? null;
}

function combatTurnKey() {
  const combat = game?.combat;
  if (!combat?.started) return 'out-of-combat';
  return `${combat.id ?? 'combat'}:${combat.round ?? 0}:${combat.turn ?? 0}`;
}

function combatRound() {
  return Number(game?.combat?.round ?? 0) || 0;
}

function currentCombatantIndexForActor(actor) {
  const combat = game?.combat;
  if (!combat?.started || !actor?.id) return null;
  const combatants = Array.from(combat.combatants ?? []);
  return combatants.findIndex(c => String(c.actorId ?? c.actor?.id ?? '') === String(actor.id));
}

function targetHasNotActed(actor, context = {}) {
  const explicit = context.targetHasNotActedInCombat
    ?? context.workflowContext?.targetHasNotActedInCombat
    ?? context.workflowContext?.attack?.targetHasNotActedInCombat
    ?? context.combatContext?.targetHasNotActedInCombat;
  if (explicit !== undefined) return explicit === true || explicit === 'true' || explicit === 1 || explicit === '1';

  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? null;
  if (!target || !game?.combat?.started) return false;
  const targetIndex = currentCombatantIndexForActor(target);
  const currentTurn = Number(game.combat.turn ?? -1);
  if (targetIndex < 0 || currentTurn < 0) return false;
  return targetIndex > currentTurn;
}

function primaryDamageDieFormula(baseFormula) {
  const match = String(baseFormula ?? '').match(/(?:^|[^\d])(\d*)d(\d+)/i);
  if (!match) return '';
  const sides = Number(match[2]);
  if (!Number.isFinite(sides) || sides <= 0) return '';
  return `1d${sides}`;
}

function attackTypeMatches(rule, attackType) {
  const wanted = normalizeKey(attackType);
  const required = asArray(rule?.requiresAttackType).map(normalizeKey);
  if (!required.length || required.includes('any')) return true;
  if (wanted === 'unarmed' && required.includes('melee')) return true;
  return required.includes(wanted);
}

function currentComboState(actor) {
  const state = actor?.getFlag?.('foundryvtt-swse', 'attackComboState') ?? actor?.flags?.['foundryvtt-swse']?.attackComboState ?? {};
  return state && typeof state === 'object' ? foundry.utils.deepClone(state) : {};
}

async function setComboState(actor, state) {
  if (!actor) return;
  if (ActorEngine?.updateActor) {
    await ActorEngine.updateActor(actor, { 'flags.foundryvtt-swse.attackComboState': state }, {
      meta: { guardKey: 'attack-combo-state' },
      source: 'CombatFeatDamageRuleResolver.setComboState'
    });
    return;
  }
  await actor.setFlag?.('foundryvtt-swse', 'attackComboState', state);
}

function skipPending(state = {}, ruleId = '') {
  return asArray(state?.skipNextDamageRuleIds).map(normalizeKey).includes(normalizeKey(ruleId));
}

function activeComboDamageRules(actor, weapon, context = {}) {
  const state = currentComboState(actor);
  const attackType = weaponAttackType(weapon, context);
  const explicitSkipRuleIds = new Set(asArray(context.attackComboActivatedThisAttack ?? context.workflowContext?.attackCombo?.activatedRuleIds).map(normalizeKey));
  const nowRound = combatRound();
  return collectAttackComboRules(actor).filter(rule => {
    if (rule?.benefit?.type !== 'EXTRA_DAMAGE_DIE_ON_FOLLOWUP_ATTACKS') return false;
    if (!attackTypeMatches(rule, attackType)) return false;
    if (explicitSkipRuleIds.has(normalizeKey(rule.id))) return false;
    if (skipPending(state, rule.id)) return false;
    const active = state?.active?.[rule.id];
    if (!active) return false;
    if (active.targetId && targetIdFromContext(context) && String(active.targetId) !== String(targetIdFromContext(context))) return false;
    if (Number.isFinite(Number(active.expiresAfterRound)) && nowRound > Number(active.expiresAfterRound)) return false;
    return true;
  });
}

export class CombatFeatDamageRuleResolver {
  static getDamageFormulaParts(actor, weapon, context = {}, baseFormula = '') {
    const parts = { flatBonus: 0, extraWeaponDice: 0, diceFormula: '', breakdown: [] };

    for (const rule of collectDamageRiders(actor)) {
      const mutation = rule?.damageMutation;
      if (mutation?.type !== 'HEROIC_LEVEL_DAMAGE_REPLACEMENT') continue;
      if (!targetHasNotActed(actor, context)) continue;
      const heroic = Math.max(0, Number(getHeroicLevel(actor)) || Number(actor?.system?.level) || 0);
      const half = Math.max(0, Number(getEffectiveHalfLevel(actor)) || Math.floor(heroic / 2));
      const bonus = Math.max(0, heroic - half);
      if (bonus <= 0) continue;
      parts.flatBonus += bonus;
      parts.breakdown.push({ label: rule.label ?? 'Advantageous Attack', value: bonus, type: 'damage' });
    }

    const comboRules = activeComboDamageRules(actor, weapon, context);
    const extraDice = comboRules.reduce((sum, rule) => sum + Math.max(0, Number(rule?.benefit?.extraDamageDice ?? 0) || 0), 0);
    if (extraDice > 0) {
      const die = primaryDamageDieFormula(baseFormula || weapon?.system?.damage || weapon?.system?.damageFormula || '');
      if (die) {
        parts.extraWeaponDice = extraDice;
        parts.diceFormula = `${extraDice}${die.slice(1)}`;
        for (const rule of comboRules) {
          parts.breakdown.push({ label: rule.label ?? 'Attack Combo', value: `+${rule?.benefit?.extraDamageDice ?? 1} die`, type: 'damageDice' });
        }
      }
    }

    return parts;
  }

  static async recordAttackComboAttack(actor, weapon, context = {}) {
    if (!actor || context.isHit !== true) return null;
    const targetId = targetIdFromContext(context);
    if (!targetId) return null;

    const attackType = weaponAttackType(weapon, context);
    const rules = collectAttackComboRules(actor).filter(rule => rule?.benefit?.type === 'EXTRA_DAMAGE_DIE_ON_FOLLOWUP_ATTACKS' && attackTypeMatches(rule, attackType));
    if (!rules.length) return null;

    const state = currentComboState(actor);
    state.sequences ??= {};
    state.active ??= {};
    state.skipNextDamageRuleIds = asArray(state.skipNextDamageRuleIds);
    const turnKey = combatTurnKey();
    const activatedRuleIds = [];

    for (const rule of rules) {
      const previous = state.sequences[rule.id] ?? {};
      const continues = previous.targetId === String(targetId) && previous.turnKey === turnKey;
      const hits = continues ? Math.max(0, Number(previous.hits ?? 0)) + 1 : 1;
      state.sequences[rule.id] = {
        targetId: String(targetId),
        turnKey,
        hits,
        lastAttackType: attackType,
        updatedAt: Date.now()
      };
      if (hits >= Math.max(2, Number(rule.sequence?.requiredHits ?? 2))) {
        state.active[rule.id] = {
          targetId: String(targetId),
          activatedAtTurnKey: turnKey,
          activatedAt: Date.now(),
          expiresAfterRound: combatRound() + 1,
          source: rule.source ?? rule.label ?? rule.id
        };
        if (!state.skipNextDamageRuleIds.includes(rule.id)) state.skipNextDamageRuleIds.push(rule.id);
        activatedRuleIds.push(rule.id);
      }
    }

    await setComboState(actor, state);
    return activatedRuleIds.length ? { activatedRuleIds, activatedThisAttack: true } : null;
  }

  static async clearPendingComboDamageSkips(actor) {
    const state = currentComboState(actor);
    if (!asArray(state.skipNextDamageRuleIds).length) return false;
    state.skipNextDamageRuleIds = [];
    await setComboState(actor, state);
    return true;
  }
}

export default CombatFeatDamageRuleResolver;
