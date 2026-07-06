import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
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
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function abilityModifier(actor, ability) {
  const key = normalizeKey(ability).slice(0, 3);
  const value = actor?.system?.abilities?.[key]?.mod
    ?? actor?.system?.attributes?.[key]?.mod
    ?? actor?.system?.stats?.[key]?.mod
    ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function selectedChoiceValues(item) {
  const rawValues = [
    item?.system?.selectedChoice,
    item?.system?.selectedChoices,
    item?.system?.choiceMeta?.selectedChoice,
    item?.system?.abilityMeta?.selectedChoice
  ];
  const values = [];
  const visit = value => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value === 'string') return values.push(value);
    if (typeof value === 'object') {
      for (const key of ['value', 'id', 'group', 'weapon', 'weaponGroup', 'label', 'name']) visit(value[key]);
    }
  };
  rawValues.forEach(visit);
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  if (paren?.[1]) values.push(paren[1]);
  return values.map(normalizeKey).filter(Boolean);
}

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function weaponMatchesChoice(weapon, choice, context = {}) {
  const wanted = normalizeKey(choice);
  if (!wanted) return false;
  const text = weaponText(weapon, context);
  if (text.includes(wanted)) return true;
  if (wanted.includes('pistol') && text.includes('pistol')) return true;
  if (wanted.includes('rifle') && text.includes('rifle')) return true;
  if (wanted.includes('simple') && text.includes('simple')) return true;
  if (wanted.includes('advanced-melee') && text.includes('advanced-melee')) return true;
  if (wanted.includes('exotic') && text.includes('exotic')) return true;
  return false;
}

function isHeavyOrVehicleWeapon(weapon, context = {}) {
  const text = weaponText(weapon, context);
  return text.includes('heavy-weapon') || text.includes('heavy-weapons') || text.includes('vehicle-weapon') || text.includes('vehicle-weapons') || text.includes('starship-weapon') || contextAffirms(context.vehicleWeapon) || contextAffirms(context.heavyWeapon);
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat' && item?.system?.disabled !== true && normalizeKey(item.name) === wanted);
}

function returnFireRules(actor) {
  const out = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true || normalizeKey(item.name) !== 'return-fire') continue;
    for (const rule of asArray(item?.system?.abilityMeta?.rules)) {
      if (rule?.id !== 'returnFireRangedMissReactionAttack') continue;
      out.push({ ...rule, sourceName: item.name, sourceId: item.id, choiceValues: selectedChoiceValues(item) });
    }
  }
  return out;
}

function isReturnFireTrigger(context = {}) {
  const trigger = normalizeKey(context.trigger ?? context.workflowContext?.trigger ?? '');
  return trigger === 'enemy-misses-you-with-ranged-attack'
    || (contextAffirms(context.triggeringAttackMissed) && contextAffirms(context.triggeringAttackWasRanged))
    || (context.workflowContext?.hit === false && contextAffirms(context.workflowContext?.rangedAttack));
}

function getReturnFireUses(actor, rule) {
  if (actorHasFeat(actor, 'Combat Reflexes')) return Math.max(1, abilityModifier(actor, 'dexterity'));
  return 1;
}

function getReturnFireReactions(actor, weapon, context = {}) {
  if (!actor || !isReturnFireTrigger(context)) return [];
  if (isHeavyOrVehicleWeapon(weapon, context)) return [];
  if (context.requiresLineOfSight !== false && context.lineOfSight === false) return [];
  if (context.requiresWeaponInHand !== false && context.weaponInHand === false) return [];

  return returnFireRules(actor).filter(rule => {
    if (!rule.choiceValues.length) return false;
    return rule.choiceValues.some(choice => weaponMatchesChoice(weapon, choice, context));
  }).map(rule => {
    const uses = getReturnFireUses(actor, rule);
    const key = `${rule.id}:${rule.sourceId}`;
    return {
      id: rule.id,
      key,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'reactionAttackResource',
      trigger: rule.trigger,
      actionType: 'reaction',
      target: 'triggeringEnemy',
      attack: rule.attack,
      oncePer: rule.oncePer ?? 'encounter',
      usesPerEncounter: uses,
      maxOncePerEnemyTurn: actorHasFeat(actor, 'Combat Reflexes'),
      available: EncounterUseTracker.canUse(actor, key, { oncePer: 'encounter', maxUses: uses }),
      selectedChoice: rule.choiceValues,
      rule
    };
  });
}

async function spendReturnFire(actor, reactionKey) {
  return EncounterUseTracker.checkAndMarkUsed(actor, reactionKey, { oncePer: 'encounter' });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseReturnFireRuntimePatched === true) return;
  CombatOptionResolver.getReturnFireReactions = getReturnFireReactions;
  CombatOptionResolver.spendReturnFire = spendReturnFire;
  CombatOptionResolver.__swseReturnFireRuntimePatched = true;
}

export function registerReturnFireRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getReturnFireReactions = getReturnFireReactions;
  game.swse.feats.spendReturnFire = spendReturnFire;
  SWSELogger.log('[ReturnFireRuntime] Runtime helpers registered');
}

export { getReturnFireReactions, spendReturnFire };

export default registerReturnFireRuntimePatches;
