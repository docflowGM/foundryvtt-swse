import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { rollAttack } from '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js';
import { buildFullAttackSequence, FULL_ATTACK_PACKAGES, getEquippedWeapons, getWeaponGroup } from '/systems/foundryvtt-swse/scripts/combat/multi-attack.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { showRollModifiersDialog } from '/systems/foundryvtt-swse/scripts/rolls/roll-config.js';
import { COMBAT_FEATURE_ACTIONS } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import { canonicalCombatFeatureKey, combatFeatureIdForEffect } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * Combat Feature Handlers
 *
 * Phase 5/6 permanent behavior layer. The router dispatches here; handlers are
 * responsible for opening the correct canonical dialog/engine path or failing
 * closed with a clear manual/source-detail fallback.
 */

export const COMBAT_ATTACK_OPTION_SPECS = Object.freeze({
  'power-attack': {
    label: 'Power Attack',
    combatOptions: { powerAttack: 1 },
    attackOptions: { powerAttack: true },
    requiresWeaponBranch: 'melee',
    actionId: 'power-attack',
    note: 'Power Attack: attack penalty converted to damage bonus.'
  },
  flurry: {
    label: 'Flurry',
    combatOptions: { flurry: true, rapidStrike: true },
    attackOptions: { flurry: true, rapidStrike: true },
    requiresWeaponBranch: 'melee',
    actionId: 'flurry',
    note: 'Flurry/Rapid Strike attack option applied.'
  },
  'rapid-strike': {
    label: 'Rapid Strike',
    combatOptions: { rapidStrike: true },
    attackOptions: { flurry: true, rapidStrike: true },
    requiresWeaponBranch: 'melee',
    actionId: 'rapid-strike',
    note: 'Rapid Strike attack option applied.'
  },
  'power-blast': {
    label: 'Power Blast',
    combatOptions: { powerBlast: 1 },
    attackOptions: { powerBlast: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'power-blast',
    note: 'Power Blast: attack penalty converted to ranged damage bonus.'
  },
  'burst-fire': {
    label: 'Burst Fire',
    combatOptions: { burstFire: true },
    attackOptions: { burstFire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'burst-fire',
    attackMode: 'autofire',
    note: 'Burst Fire option applied.'
  },
  'rapid-shot': {
    label: 'Rapid Shot',
    combatOptions: { rapidShot: true },
    attackOptions: { rapidShot: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'rapid-shot',
    note: 'Rapid Shot option applied.'
  },
  autofire: {
    label: 'Autofire',
    combatOptions: { autofire: true },
    attackOptions: { autofire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'autofire',
    attackMode: 'autofire',
    note: 'Autofire attack mode applied.'
  },
  'charging-fire': {
    label: 'Charging Fire',
    combatOptions: { chargingFire: true },
    attackOptions: { chargingFire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'charging-fire',
    note: 'Charging Fire attack option applied.'
  },
  'powerful-charge': {
    label: 'Powerful Charge',
    combatOptions: { powerfulCharge: true },
    attackOptions: { powerfulCharge: true },
    requiresWeaponBranch: 'melee',
    actionId: 'powerful-charge',
    note: 'Powerful Charge attack option applied.'
  },
  'mighty-swing': {
    label: 'Mighty Swing',
    combatOptions: { mightySwing: true },
    attackOptions: { mightySwing: true },
    requiresWeaponBranch: 'melee',
    actionId: 'mighty-swing',
    note: 'Mighty Swing attack option applied.'
  }
});

export const COMBAT_MULTIATTACK_SPECS = Object.freeze({
  'double-attack': {
    id: 'double-attack',
    label: 'Double Attack',
    actionId: 'double-attack',
    packageType: FULL_ATTACK_PACKAGES.DOUBLE_ATTACK,
    attackCount: 2,
    fallbackPenalty: -5,
    penaltySource: 'Double Attack',
    actionType: 'full-round'
  },
  'triple-attack': {
    id: 'triple-attack',
    label: 'Triple Attack',
    actionId: 'triple-attack',
    packageType: FULL_ATTACK_PACKAGES.TRIPLE_ATTACK,
    attackCount: 3,
    fallbackPenalty: -10,
    penaltySource: 'Triple Attack',
    actionType: 'full-round'
  }
});

export function getAttackOptionSpec(featureId) {
  return COMBAT_ATTACK_OPTION_SPECS[canonicalCombatFeatureKey(featureId)] ?? null;
}

export function getMultiattackSpec(featureId) {
  return COMBAT_MULTIATTACK_SPECS[canonicalCombatFeatureKey(featureId)] ?? null;
}

function itemFromAnyActor(itemId, actor = null) {
  if (!itemId) return null;
  if (actor?.items?.get?.(itemId)) return actor.items.get(itemId);
  for (const candidate of game?.actors ?? []) {
    const item = candidate?.items?.get?.(itemId);
    if (item) return item;
  }
  return null;
}

function isRangedWeapon(item) {
  const system = item?.system ?? {};
  const branch = String(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? '').toLowerCase();
  if (branch === 'ranged') return true;
  if (branch === 'melee') return false;
  const range = String(system.range ?? '').toLowerCase();
  if (range && range !== 'melee') return true;
  const text = [item?.type, item?.name, system.weaponType, system.weaponGroup, system.weaponCategory, system.proficiency, system.category, system.subcategory].join(' ').toLowerCase();
  return /ranged|pistol|rifle|blaster|bowcaster|launcher|grenade|heavy/.test(text) && !/lightsaber|melee|vibro|blade|sword|unarmed/.test(text);
}

function weaponBranch(item) {
  return isRangedWeapon(item) ? 'ranged' : 'melee';
}

function equippedWeaponForSpec(actor, spec = {}) {
  const equipped = getEquippedWeapons(actor);
  const weapons = [equipped.primary, equipped.offhand]
    .filter(Boolean)
    .filter((weapon, index, list) => list.findIndex(other => other?.id === weapon?.id) === index);
  if (!spec.requiresWeaponBranch) return weapons[0] ?? null;
  return weapons.find(weapon => weaponBranch(weapon) === spec.requiresWeaponBranch) ?? weapons[0] ?? null;
}

function hasMeaningfulOptionValue(value) {
  if (value === undefined || value === null || value === false || value === '') return false;
  if (value === 'off' || value === 'false') return false;
  const n = Number(value);
  if (Number.isFinite(n) && n === 0) return false;
  return true;
}

function applyForcedAttackOption(options = {}, spec = {}) {
  const combatOptions = { ...(options.combatOptions ?? {}) };
  const attackOptions = { ...(options.attackOptions ?? {}) };

  for (const [key, value] of Object.entries(spec.combatOptions ?? {})) {
    if (!hasMeaningfulOptionValue(combatOptions[key])) combatOptions[key] = value;
  }
  for (const [key, value] of Object.entries(spec.attackOptions ?? {})) {
    if (!hasMeaningfulOptionValue(attackOptions[key])) attackOptions[key] = value;
  }

  return {
    ...options,
    combatOptions,
    attackOptions,
    attackMode: spec.attackMode ?? options.attackMode,
    actionId: spec.actionId ?? options.actionId,
    actionName: spec.label ?? options.actionName,
    rollNote: [options.rollNote, spec.note].filter(Boolean).join(' | ')
  };
}

function fallbackMultiAttackPlan(actor, spec, weapon) {
  const penalty = Number(spec?.fallbackPenalty ?? 0);
  const count = Number(spec?.attackCount ?? 0);
  return {
    legal: !!weapon && count > 0,
    packageType: spec.packageType,
    actionType: spec.actionType ?? 'full-round',
    warnings: weapon ? [] : ['No weapon equipped. Equip a weapon before using this attack.'],
    attacks: Array.from({ length: count }, (_, index) => ({
      weapon,
      label: `${weapon?.name ?? 'Weapon'} — Attack ${index + 1}`,
      weaponGroup: getWeaponGroup(weapon),
      basePenalty: penalty,
      reduction: 0,
      finalPenalty: penalty,
      penaltySource: spec.penaltySource ?? spec.label
    }))
  };
}

export async function executeCombatFeatureMultiattack({ actor, element, featureId } = {}) {
  const spec = getMultiattackSpec(featureId);
  if (!actor || !spec) {
    ui?.notifications?.warn?.('This multiattack feature is not wired yet.');
    return;
  }

  const equipped = getEquippedWeapons(actor);
  let plan = buildFullAttackSequence(actor, { requestedPackage: spec.packageType, primaryWeapon: equipped.primary });
  if (!plan?.legal) plan = fallbackMultiAttackPlan(actor, spec, equipped.primary);
  if (!plan?.legal || !plan.attacks?.length) {
    ui?.notifications?.warn?.(plan?.warnings?.join(' ') || 'No legal multiattack sequence is available.');
    return;
  }

  const actionName = spec.label;
  let spend = null;
  let rolled = 0;

  for (let index = 0; index < plan.attacks.length; index += 1) {
    const step = plan.attacks[index];
    const weapon = step.weapon;
    const options = await showRollModifiersDialog({
      title: `${actionName}: ${step.label}`,
      rollType: 'attack',
      actor,
      weapon,
      sourceElement: element,
      showCover: true,
      showConcealment: true,
      showForcePoint: true
    });

    if (!options) {
      if (!rolled && spend?.rollback) await spend.rollback();
      return;
    }

    if (!spend) {
      spend = await ActionEconomyConsumption.spend(actor, spec.actionType ?? 'full-round', {
        actionName,
        actionId: spec.actionId,
        source: 'combat-feature-handlers'
      }, { notify: true });
      if (spend?.allowed === false || spend?.permitted === false) return;
    }

    const result = await rollAttack(actor, weapon, {
      ...options,
      sourceElement: element,
      sequencePenalty: Number(step.finalPenalty ?? 0) + Number(options.sequencePenalty ?? 0),
      actionId: spec.actionId,
      actionName,
      actionData: {
        packageType: spec.packageType,
        attackIndex: index + 1,
        attackCount: plan.attacks.length,
        declaredAttackCount: spec.attackCount,
        penaltySource: step.penaltySource ?? spec.penaltySource,
        basePenalty: step.basePenalty,
        reduction: step.reduction,
        finalPenalty: step.finalPenalty,
        combatFeatureAction: true,
        multiattackFeature: spec.id
      },
      rollNote: [options.rollNote, `${actionName} ${index + 1}/${plan.attacks.length}: ${(step.penaltySource ?? spec.penaltySource)} ${step.finalPenalty}`].filter(Boolean).join(' | ')
    });

    if (!result && !rolled && spend?.rollback) {
      await spend.rollback();
      return;
    }
    if (result) rolled += 1;
  }
}

export async function executeCombatFeatureAttackOption({ actor, element, featureId } = {}) {
  const spec = getAttackOptionSpec(featureId);
  if (!actor || !spec) {
    ui?.notifications?.warn?.('This attack option is not wired yet.');
    return;
  }

  const weapon = equippedWeaponForSpec(actor, spec);
  if (!weapon) {
    ui?.notifications?.warn?.(`Equip a ${spec.requiresWeaponBranch || ''} weapon before using ${spec.label}.`);
    return;
  }

  if (spec.requiresWeaponBranch && weaponBranch(weapon) !== spec.requiresWeaponBranch) {
    ui?.notifications?.warn?.(`${spec.label} requires a ${spec.requiresWeaponBranch} weapon.`);
    return;
  }

  const seedOptions = applyForcedAttackOption({ combatOptions: spec.combatOptions, attackOptions: spec.attackOptions, attackMode: spec.attackMode }, spec);
  const options = await showRollModifiersDialog({
    title: `${spec.label}: ${weapon.name}`,
    rollType: 'attack',
    actor,
    weapon,
    sourceElement: element,
    showCover: true,
    showConcealment: true,
    showForcePoint: true,
    ...seedOptions
  });

  if (!options) return;
  const finalOptions = applyForcedAttackOption(options, spec);
  await rollAttack(actor, weapon, {
    ...finalOptions,
    sourceElement: element,
    actionData: {
      ...(finalOptions.actionData ?? {}),
      combatFeatureAction: true,
      forcedCombatOptions: spec.combatOptions ?? {},
      forcedAttackOptions: spec.attackOptions ?? {}
    }
  });
}

export async function viewCombatFeature({ actor, element } = {}) {
  const sourceItemId = element?.dataset?.sourceItemId || '';
  const item = itemFromAnyActor(sourceItemId, actor);
  if (item?.sheet?.render) {
    item.sheet.render(true);
    return;
  }

  const label = element?.querySelector?.('strong')?.textContent?.trim() || element?.dataset?.featureId || 'Combat feature';
  const summary = element?.getAttribute?.('title') || 'No source item is available for this feature yet.';
  ui?.notifications?.info?.(`${label}: ${summary}`);
}

export async function executeCombatFeatureResource({ actor, element } = {}) {
  const featureId = canonicalCombatFeatureKey(element?.dataset?.featureId || '');
  if (featureId === 'second-wind') {
    if (!actor?.isOwner) {
      ui?.notifications?.warn?.('You do not control this actor.');
      return;
    }
    const result = await ActorEngine.applySecondWind(actor);
    if (result?.success === false) {
      ui?.notifications?.warn?.(result.reason || 'No Second Wind uses remaining.');
      return;
    }
    ui?.notifications?.info?.(`Regained ${result?.healed ?? 0} HP!`);
    return;
  }

  ui?.notifications?.warn?.('This combat resource is not automated yet. Opening source details instead.');
  return viewCombatFeature({ actor, element });
}

export async function deactivateCombatFeature({ actor, element } = {}) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return;
  }

  const featureId = canonicalCombatFeatureKey(element?.dataset?.featureId || '');
  const effectId = element?.dataset?.effectId || '';
  const effect = effectId
    ? actor?.effects?.get?.(effectId)
    : Array.from(actor?.effects ?? []).find(candidate => combatFeatureIdForEffect(candidate) === featureId);

  if (!effect?.id) {
    ui?.notifications?.warn?.('This active combat feature does not have an automated end action yet.');
    return;
  }

  await ActorEngine.deleteActiveEffects(actor, [effect.id], { source: 'combat-feature-handlers' });
  ui?.notifications?.info?.(`${effect.name ?? 'Combat feature'} ended.`);
}

export async function activateCombatFeature({ actor, element } = {}) {
  ui?.notifications?.warn?.('This combat feature activation is not automated yet. Opening source details instead.');
  return viewCombatFeature({ actor, element });
}

export async function handleCombatFeatureAction({ action, actor, element } = {}) {
  switch (action) {
    case COMBAT_FEATURE_ACTIONS.VIEW:
      return viewCombatFeature({ actor, element });
    case COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION:
      return executeCombatFeatureAttackOption({ actor, element, featureId: element?.dataset?.featureId });
    case COMBAT_FEATURE_ACTIONS.EXECUTE_MULTIATTACK:
      return executeCombatFeatureMultiattack({ actor, element, featureId: element?.dataset?.featureId });
    case COMBAT_FEATURE_ACTIONS.EXECUTE_RESOURCE:
      return executeCombatFeatureResource({ actor, element });
    case COMBAT_FEATURE_ACTIONS.DEACTIVATE:
      return deactivateCombatFeature({ actor, element });
    case COMBAT_FEATURE_ACTIONS.ACTIVATE:
      return activateCombatFeature({ actor, element });
    default:
      ui?.notifications?.warn?.('This combat feature action is not wired yet. Opening source details instead.');
      return viewCombatFeature({ actor, element });
  }
}
