import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { rollAttack } from '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js';
import { buildFullAttackSequence, FULL_ATTACK_PACKAGES, getEquippedWeapons, getWeaponGroup } from '/systems/foundryvtt-swse/scripts/combat/multi-attack.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { showRollModifiersDialog } from '/systems/foundryvtt-swse/scripts/rolls/roll-config.js';
import { COMBAT_FEATURE_ACTIONS } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import { canonicalCombatFeatureKey, combatFeatureIdForEffect } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

const ROUTER_FLAG = Symbol.for('swse.combatFeatureActionRouter.v1');
let registered = false;

const ATTACK_OPTION_SPECS = new Map([
  ['power-attack', {
    label: 'Power Attack',
    combatOptions: { powerAttack: 1 },
    attackOptions: { powerAttack: true },
    requiresWeaponBranch: 'melee',
    actionId: 'power-attack',
    note: 'Power Attack: attack penalty converted to damage bonus.'
  }],
  ['flurry', {
    label: 'Flurry',
    combatOptions: { flurry: true, rapidStrike: true },
    attackOptions: { flurry: true, rapidStrike: true },
    requiresWeaponBranch: 'melee',
    actionId: 'flurry',
    note: 'Flurry/Rapid Strike attack option applied.'
  }],
  ['rapid-strike', {
    label: 'Rapid Strike',
    combatOptions: { rapidStrike: true },
    attackOptions: { flurry: true, rapidStrike: true },
    requiresWeaponBranch: 'melee',
    actionId: 'rapid-strike',
    note: 'Rapid Strike attack option applied.'
  }],
  ['power-blast', {
    label: 'Power Blast',
    combatOptions: { powerBlast: 1 },
    attackOptions: { powerBlast: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'power-blast',
    note: 'Power Blast: attack penalty converted to ranged damage bonus.'
  }],
  ['burst-fire', {
    label: 'Burst Fire',
    combatOptions: { burstFire: true },
    attackOptions: { burstFire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'burst-fire',
    attackMode: 'autofire',
    note: 'Burst Fire option applied.'
  }],
  ['rapid-shot', {
    label: 'Rapid Shot',
    combatOptions: { rapidShot: true },
    attackOptions: { rapidShot: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'rapid-shot',
    note: 'Rapid Shot option applied.'
  }],
  ['autofire', {
    label: 'Autofire',
    combatOptions: { autofire: true },
    attackOptions: { autofire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'autofire',
    attackMode: 'autofire',
    note: 'Autofire attack mode applied.'
  }],
  ['charging-fire', {
    label: 'Charging Fire',
    combatOptions: { chargingFire: true },
    attackOptions: { chargingFire: true },
    requiresWeaponBranch: 'ranged',
    actionId: 'charging-fire',
    note: 'Charging Fire attack option applied.'
  }],
  ['powerful-charge', {
    label: 'Powerful Charge',
    combatOptions: { powerfulCharge: true },
    attackOptions: { powerfulCharge: true },
    requiresWeaponBranch: 'melee',
    actionId: 'powerful-charge',
    note: 'Powerful Charge attack option applied.'
  }],
  ['mighty-swing', {
    label: 'Mighty Swing',
    combatOptions: { mightySwing: true },
    attackOptions: { mightySwing: true },
    requiresWeaponBranch: 'melee',
    actionId: 'mighty-swing',
    note: 'Mighty Swing attack option applied.'
  }]
]);

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor
    ?? null;
}

function actorFromElement(element) {
  const actorId = element?.dataset?.actorId || element?.closest?.('[data-swse-actor-id]')?.dataset?.swseActorId || '';
  if (actorId) return actorFromId(actorId);
  const appRoot = element?.closest?.('[data-appid], [data-application-id]');
  const appId = appRoot?.dataset?.appid || appRoot?.dataset?.applicationId || '';
  if (appId && ui?.windows) {
    const app = Object.values(ui.windows).find(win => String(win?.appId ?? win?.id ?? '') === String(appId));
    if (app?.actor?.items) return app.actor;
    if (app?.document?.items) return app.document;
  }
  return canvas?.tokens?.controlled?.[0]?.actor ?? null;
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

function fallbackMultiAttackPlan(actor, packageType, weapon) {
  const penalty = packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? -10 : -5;
  const count = packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? 3 : 2;
  return {
    legal: !!weapon,
    packageType,
    actionType: 'full-round',
    warnings: weapon ? [] : ['No weapon equipped. Equip a weapon before using this attack.'],
    attacks: Array.from({ length: count }, (_, index) => ({
      weapon,
      label: `${weapon?.name ?? 'Weapon'} — Attack ${index + 1}`,
      weaponGroup: getWeaponGroup(weapon),
      basePenalty: penalty,
      reduction: 0,
      finalPenalty: penalty,
      penaltySource: packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? 'Triple Attack' : 'Double Attack'
    }))
  };
}

function multiAttackKindForFeatureId(featureId = '') {
  const key = canonicalCombatFeatureKey(featureId);
  if (key === 'triple-attack') return 'triple';
  if (key === 'double-attack') return 'double';
  return null;
}

async function executeMultiAttack(actor, element, featureId) {
  const kind = multiAttackKindForFeatureId(featureId);
  if (!kind) {
    ui?.notifications?.warn?.('This multiattack feature is not wired yet.');
    return;
  }

  const equipped = getEquippedWeapons(actor);
  const packageType = kind === 'triple' ? FULL_ATTACK_PACKAGES.TRIPLE_ATTACK : FULL_ATTACK_PACKAGES.DOUBLE_ATTACK;
  let plan = buildFullAttackSequence(actor, { requestedPackage: packageType, primaryWeapon: equipped.primary });
  if (!plan?.legal) plan = fallbackMultiAttackPlan(actor, packageType, equipped.primary);
  if (!plan?.legal || !plan.attacks?.length) {
    ui?.notifications?.warn?.(plan?.warnings?.join(' ') || 'No legal multiattack sequence is available.');
    return;
  }

  const actionName = kind === 'triple' ? 'Triple Attack' : 'Double Attack';
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
      spend = await ActionEconomyConsumption.spend(actor, 'full-round', {
        actionName,
        actionId: kind === 'triple' ? 'triple-attack' : 'double-attack',
        source: 'combat-feature-action-router'
      }, { notify: true });
      if (spend?.allowed === false || spend?.permitted === false) return;
    }

    const result = await rollAttack(actor, weapon, {
      ...options,
      sourceElement: element,
      sequencePenalty: Number(step.finalPenalty ?? 0) + Number(options.sequencePenalty ?? 0),
      actionId: kind === 'triple' ? 'triple-attack' : 'double-attack',
      actionName,
      actionData: {
        packageType,
        attackIndex: index + 1,
        attackCount: plan.attacks.length,
        penaltySource: step.penaltySource,
        basePenalty: step.basePenalty,
        reduction: step.reduction,
        finalPenalty: step.finalPenalty,
        combatFeatureAction: true
      },
      rollNote: [options.rollNote, `${actionName} ${index + 1}/${plan.attacks.length}: ${step.penaltySource} ${step.finalPenalty}`].filter(Boolean).join(' | ')
    });

    if (!result && !rolled && spend?.rollback) {
      await spend.rollback();
      return;
    }
    if (result) rolled += 1;
  }
}

async function executeAttackOption(actor, element, featureId) {
  const spec = ATTACK_OPTION_SPECS.get(canonicalCombatFeatureKey(featureId));
  if (!spec) {
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

async function viewCombatFeature(actor, element) {
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

async function executeResource(actor, element) {
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
  await viewCombatFeature(actor, element);
}

async function deactivateCombatFeature(actor, element) {
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

  await ActorEngine.deleteActiveEffects(actor, [effect.id], { source: 'combat-feature-action-router' });
  ui?.notifications?.info?.(`${effect.name ?? 'Combat feature'} ended.`);
}

async function routeCombatFeatureAction(element) {
  const action = element?.dataset?.action || '';
  const actor = actorFromElement(element);
  if (!actor) {
    ui?.notifications?.warn?.('Could not resolve actor for this combat feature. Reopen the sheet and try again.');
    return;
  }

  switch (action) {
    case COMBAT_FEATURE_ACTIONS.VIEW:
      return viewCombatFeature(actor, element);
    case COMBAT_FEATURE_ACTIONS.EXECUTE_ATTACK_OPTION:
      return executeAttackOption(actor, element, element.dataset.featureId);
    case COMBAT_FEATURE_ACTIONS.EXECUTE_MULTIATTACK:
      return executeMultiAttack(actor, element, element.dataset.featureId);
    case COMBAT_FEATURE_ACTIONS.EXECUTE_RESOURCE:
      return executeResource(actor, element);
    case COMBAT_FEATURE_ACTIONS.DEACTIVATE:
      return deactivateCombatFeature(actor, element);
    case COMBAT_FEATURE_ACTIONS.ACTIVATE:
      ui?.notifications?.warn?.('This combat feature activation is not automated yet. Opening source details instead.');
      return viewCombatFeature(actor, element);
    default:
      ui?.notifications?.warn?.('This combat feature action is not wired yet. Opening source details instead.');
      return viewCombatFeature(actor, element);
  }
}

function installCombatFeatureRouter() {
  if (globalThis[ROUTER_FLAG]) return false;
  globalThis[ROUTER_FLAG] = true;
  document.addEventListener('click', event => {
    const element = event.target?.closest?.('[data-combat-features-panel] [data-action]');
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    routeCombatFeatureAction(element).catch(err => {
      console.error('[SWSE] Combat feature action failed', err);
      ui?.notifications?.error?.(`Combat feature failed: ${err.message}`);
    });
  }, true);
  return true;
}

export function registerCombatFeatureActionRouter() {
  if (registered) return false;
  registered = true;
  return installCombatFeatureRouter();
}

export default registerCombatFeatureActionRouter;
