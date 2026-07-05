import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function getMobilityRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function hasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function collectRules(actor, type) {
  const rules = [];
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of getMobilityRules(feat)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
    }
  }
  return rules;
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function selectedOptionKeys(context = {}) {
  const keys = new Set();
  for (const key of asArray(context.selectedAdvisoryOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.selectedAttackOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.workflowContext?.selectedAdvisoryOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.workflowContext?.selectedAttackOptions)) keys.add(normalizeKey(key));
  return keys;
}

function isCorneredSelected(context = {}) {
  const keys = selectedOptionKeys(context);
  return keys.has('cornered')
    || contextAffirms(context.cornered)
    || contextAffirms(context.isCornered)
    || contextAffirms(context.applyCornered)
    || contextAffirms(context.workflowContext?.cornered)
    || contextAffirms(context.workflowContext?.applyCornered);
}

function isRunningAttackContext(context = {}) {
  const action = normalizeKey(context.actionId ?? context.actionType ?? context.attackMode ?? context.workflowContext?.actionId ?? '');
  return contextAffirms(context.runningAttack)
    || contextAffirms(context.usesRunningAttack)
    || contextAffirms(context.workflowContext?.runningAttack)
    || action === 'running-attack';
}

function movedBeforeAndAfter(context = {}) {
  return (contextAffirms(context.movedBeforeAttack) || contextAffirms(context.workflowContext?.movedBeforeAttack))
    && (contextAffirms(context.movedAfterAttack) || contextAffirms(context.workflowContext?.movedAfterAttack));
}

function isRangedAttackContext(context = {}) {
  const attackType = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? context.workflowContext?.attack?.attackType ?? '');
  return attackType === 'ranged' || contextAffirms(context.rangedAttack) || contextAffirms(context.workflowContext?.rangedAttack);
}

function isAttackOfOpportunityContext(context = {}) {
  const action = normalizeKey(context.actionId ?? context.actionType ?? context.trigger ?? context.reactionType ?? context.workflowContext?.actionId ?? '');
  return contextAffirms(context.attackOfOpportunity)
    || contextAffirms(context.isAttackOfOpportunity)
    || contextAffirms(context.workflowContext?.attackOfOpportunity)
    || ['attack-of-opportunity', 'opportunity-attack', 'aoo', 'attack-of-opportunity-reaction'].includes(action);
}

function isWithdrawContext(context = {}) {
  const action = normalizeKey(context.actionId ?? context.actionType ?? context.workflowContext?.actionId ?? '');
  return action === 'withdraw' || contextAffirms(context.withdraw) || contextAffirms(context.workflowContext?.withdraw);
}

function isDamagingHitContext(context = {}) {
  const hit = contextAffirms(context.hit) || contextAffirms(context.isHit) || contextAffirms(context.workflowContext?.hit) || contextAffirms(context.workflowContext?.isHit);
  const damage = numeric(context.damage ?? context.damageTotal ?? context.workflowContext?.damage ?? context.workflowContext?.damageTotal, 0);
  return hit && damage > 0;
}

function getAttackTotal(context = {}) {
  return numeric(context.attackTotal ?? context.attackRollTotal ?? context.workflowContext?.attackTotal ?? context.workflowContext?.attackRollTotal, 0);
}

function getTargetDefense(context = {}, defenseKey = 'will') {
  const key = normalizeKey(defenseKey);
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  return numeric(
    context.targetDefense?.[key]
      ?? context.workflowContext?.targetDefense?.[key]
      ?? target?.system?.defenses?.[key]?.value
      ?? target?.system?.derived?.defenses?.[key]
      ?? target?.system?.defense?.[key]
      ?? 0,
    0
  );
}

function actorSpeedSquares(actor, context = {}) {
  return numeric(context.speedSquares
    ?? context.workflowContext?.speedSquares
    ?? actor?.system?.speed?.value
    ?? actor?.system?.speed?.base
    ?? actor?.system?.movement?.walk?.value
    ?? actor?.system?.movement?.walk
    ?? actor?.system?.derived?.speed
    ?? 0,
    0
  );
}

function getTargetSizeRank(context = {}) {
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  const size = normalizeKey(context.targetSize ?? context.workflowContext?.targetSize ?? target?.system?.details?.size ?? target?.system?.size ?? '');
  const ranks = { fine: 0, diminutive: 1, tiny: 2, small: 3, medium: 4, large: 5, huge: 6, gargantuan: 7, colossal: 8 };
  return ranks[size] ?? null;
}

function targetIsGrabbedOrGrappled(context = {}) {
  return contextAffirms(context.targetGrabbed)
    || contextAffirms(context.targetGrappled)
    || contextAffirms(context.workflowContext?.targetGrabbed)
    || contextAffirms(context.workflowContext?.targetGrappled);
}

function isWeaponProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function collectRunningAttackRiders(actor) {
  return collectRules(actor, 'RUNNING_ATTACK_RIDER')
    .filter(rule => !rule?.prerequisiteFeat || hasFeat(actor, rule.prerequisiteFeat));
}

function resolveRunningAttackRiders(actor, context = {}) {
  if (!actor || !isRunningAttackContext(context) || !movedBeforeAndAfter(context)) {
    return { speedBonusSquares: 0, riders: [] };
  }
  const riders = collectRunningAttackRiders(actor);
  const total = riders.reduce((sum, rider) => sum + numeric(rider?.movement?.speedBonusSquares, 0), 0);
  return { speedBonusSquares: total, appliesUntil: 'endOfTurn', riders };
}

function resolveWithdrawRiders(actor, context = {}) {
  if (!actor || !isWithdrawContext(context)) return { extraSquares: 0, riders: [] };
  const riders = collectRules(actor, 'WITHDRAW_ACTION_RIDER');
  const total = riders.reduce((sum, rider) => sum + numeric(rider?.movement?.extraWithdrawSquares, 0), 0);
  return { extraSquares: total, riders };
}

function resolveAttackOfOpportunityReplacementRiders(actor, context = {}) {
  if (!actor || !isAttackOfOpportunityContext(context)) return [];
  return collectRules(actor, 'ATTACK_OF_OPPORTUNITY_REPLACEMENT_RIDER')
    .filter(rule => !rule.prerequisiteFeat || hasFeat(actor, rule.prerequisiteFeat))
    .map(rule => {
      const speed = actorSpeedSquares(actor, context);
      const distance = Math.floor(speed * numeric(rule?.movement?.speedFraction, 0.5));
      return {
        id: rule.id,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'sacrificeAttackOfOpportunityForMovement',
        oncePerTurn: rule.frequency?.limit === 1 && rule.frequency?.period === 'turn',
        sacrificeAttack: rule.replaces?.sacrificeAttack === true,
        distanceSquares: distance,
        provokesAttacksOfOpportunity: rule.movement?.provokesAttacksOfOpportunity === true,
        advisoryOnly: rule.movement?.advisoryOnly !== false,
        note: rule.movement?.note ?? rule.summary,
        rule
      };
    });
}

function collectAttackAdvisoryOptions(actor) {
  return collectRules(actor, 'ATTACK_ADVISORY_OPTION');
}

function getSelectableAttackAdvisories(actor) {
  return collectAttackAdvisoryOptions(actor)
    .filter(rule => rule?.selection?.playerSelectable === true)
    .map(rule => ({
      key: rule.selection?.key ?? rule.id,
      id: rule.id,
      label: rule.selection?.label ?? rule.label,
      prompt: rule.selection?.prompt ?? rule.summary,
      defaultSelected: rule.selection?.defaultSelected === true,
      source: rule.sourceName ?? rule.source ?? rule.label,
      rule
    }));
}

function applyCorneredAttackBonus(result, actor, context = {}) {
  if (!actor || !isCorneredSelected(context)) return;
  const cornered = collectAttackAdvisoryOptions(actor).find(rule => normalizeKey(rule.id) === 'cornered');
  if (!cornered) return;
  const bonus = numeric(cornered?.attack?.bonus, 2);
  if (!bonus) return;
  result.attackBonus = numeric(result.attackBonus, 0) + bonus;
  result.breakdown ??= [];
  result.breakdown.push({ label: cornered.sourceName ?? cornered.label ?? 'Cornered', value: bonus, type: 'attackAdvisory' });
  result.flags ??= {};
  result.flags.corneredAdvisoryBonus = true;
}

function collectPostHitRules(actor) {
  return [
    ...collectRules(actor, 'ATTACK_OF_OPPORTUNITY_DAMAGE_RIDER'),
    ...collectRules(actor, 'RANGED_DAMAGE_RIDER')
  ];
}

function targetEligibleForBanthaHerder(rule, context = {}) {
  const maxSize = normalizeKey(rule?.targetEligibility?.maxSize ?? 'large');
  const ranks = { fine: 0, diminutive: 1, tiny: 2, small: 3, medium: 4, large: 5, huge: 6, gargantuan: 7, colossal: 8 };
  const targetRank = getTargetSizeRank(context);
  const maxRank = ranks[maxSize] ?? 5;
  if (targetRank !== null && targetRank > maxRank) return false;
  if (targetIsGrabbedOrGrappled(context)) return false;
  if (!isWeaponProficientContext(context)) return false;
  return true;
}

function resolvePostHitAdvisoryRiders(actor, context = {}) {
  if (!actor || !isDamagingHitContext(context)) return [];
  const attackTotal = getAttackTotal(context);

  return collectPostHitRules(actor).flatMap(rule => {
    if (rule.type === 'ATTACK_OF_OPPORTUNITY_DAMAGE_RIDER') {
      if (!isAttackOfOpportunityContext(context)) return [];
      if (rule.prerequisiteFeat && !hasFeat(actor, rule.prerequisiteFeat)) return [];
      return [{
        id: `${rule.id}-self-movement`,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'selfMovement',
        advisoryOnly: true,
        distanceSquares: rule.selfMovementOnHit?.distanceSquares ?? 1,
        direction: rule.selfMovementOnHit?.direction ?? 'any',
        provokesAttacksOfOpportunity: rule.selfMovementOnHit?.provokesAttacksOfOpportunity === true,
        note: rule.selfMovementOnHit?.note ?? rule.summary,
        rule
      }];
    }

    if (rule.type === 'RANGED_DAMAGE_RIDER') {
      if (rule.requiresAttackType === 'ranged' && !isRangedAttackContext(context)) return [];
      if (!targetEligibleForBanthaHerder(rule, context)) return [];
      const defenseKey = String(rule.compareAttackRollToDefense ?? '').trim();
      if (defenseKey) {
        const targetDefense = getTargetDefense(context, defenseKey);
        if (!targetDefense || attackTotal < targetDefense) return [];
      }
      return asArray(rule.targetEffectsOnDamage).map(effect => ({
        id: `${rule.id}-${effect.type ?? 'effect'}`,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: effect.type,
        advisoryOnly: effect.advisoryOnly !== false,
        distanceSquares: effect.distanceSquares,
        direction: effect.direction,
        actionTiming: effect.actionTiming,
        restrictions: effect.restrictions,
        supportsMultipleEligibleTargets: rule.supportsMultipleEligibleTargets === true,
        note: effect.note ?? rule.summary,
        rule,
        effect
      }));
    }
    return [];
  });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseMobilityPositioningRuntimePatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
      const result = original(actor, weapon, context) ?? {};
      try { applyCorneredAttackBonus(result, actor, context); }
      catch (err) { SWSELogger.warn('[MobilityPositioningRuntime] Failed to apply attack advisory modifiers', { error: err }); }
      return result;
    };
  }
  CombatOptionResolver.getSelectableAttackAdvisories = getSelectableAttackAdvisories;
  CombatOptionResolver.resolvePostHitAdvisoryRiders = resolvePostHitAdvisoryRiders;
  CombatOptionResolver.resolveAttackOfOpportunityReplacementRiders = resolveAttackOfOpportunityReplacementRiders;
  CombatOptionResolver.resolveWithdrawRiders = resolveWithdrawRiders;
  CombatOptionResolver.__swseMobilityPositioningRuntimePatched = true;
}

export function registerMobilityPositioningRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.resolveRunningAttackRiders = resolveRunningAttackRiders;
  game.swse.feats.resolveWithdrawRiders = resolveWithdrawRiders;
  game.swse.feats.resolveAttackOfOpportunityReplacementRiders = resolveAttackOfOpportunityReplacementRiders;
  game.swse.feats.getSelectableAttackAdvisories = getSelectableAttackAdvisories;
  game.swse.feats.resolvePostHitAdvisoryRiders = resolvePostHitAdvisoryRiders;
  SWSELogger.log('[MobilityPositioningRuntime] Runtime helpers registered');
}

export {
  resolveRunningAttackRiders,
  resolveWithdrawRiders,
  resolveAttackOfOpportunityReplacementRiders,
  getSelectableAttackAdvisories,
  resolvePostHitAdvisoryRiders
};

export default registerMobilityPositioningRuntimePatches;
