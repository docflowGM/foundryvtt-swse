import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getExistingRules(item) {
  return asArray(item?.system?.abilityMeta?.rules);
}

function hasAreaExplosivesRule(item, source) {
  const wanted = normalizeName(source);
  return getExistingRules(item).some(rule => normalizeName(rule?.source ?? '') === wanted
    && (String(rule?.type ?? '') === 'ATTACK_OPTION' || String(rule?.type ?? '').startsWith('AREA_') || String(rule?.type ?? '').startsWith('MOVEMENT_')));
}

function advisoryAreaRule({ id, label, shape, targeting, actionType = 'standard', requiresAttackType = 'ranged', summary, source }) {
  return {
    type: 'ATTACK_OPTION',
    id,
    label,
    control: 'flag',
    requiresAttackType,
    actionEconomy: {
      type: actionType,
      spend: actionType === 'full-round' ? 'fullRoundAction' : 'ridesAttack'
    },
    areaEffect: {
      advisoryOnly: true,
      shape,
      targeting,
      canvasAutomation: false,
      note: 'Spatial targeting, template placement, line of sight, line of effect, and final affected targets remain GM/player adjudicated.'
    },
    source,
    summary
  };
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'targeted area') {
    return [{
      type: 'ATTACK_OPTION',
      id: 'targetedArea',
      label: 'Targeted Area',
      control: 'toggle',
      requiresAreaAttack: true,
      damageModifier: 5,
      areaEffect: {
        advisoryOnly: true,
        targetSelection: 'singleHitTargetWithinArea',
        timing: 'afterSuccessfulAreaAttackBeforeEvasion',
        canvasAutomation: false,
        note: 'Select one target hit by the area attack. That target takes +5 damage before Evasion is applied.'
      },
      source: 'Targeted Area',
      summary: 'When a successful area attack hits at least one target, select one hit target in the area to take +5 damage before Evasion.'
    }];
  }

  if (normalized === 'whirlwind attack') {
    return [advisoryAreaRule({
      id: 'whirlwindAttack',
      label: 'Whirlwind Attack',
      shape: 'meleeReachBurst',
      targeting: 'enemiesWithinReach',
      actionType: 'full-round',
      requiresAttackType: 'melee',
      source: 'Whirlwind Attack',
      summary: 'Advisory full-round melee area action. Target selection within reach is spatial and GM/player adjudicated.'
    })];
  }

  if (normalized === 'spray shot') {
    return [advisoryAreaRule({
      id: 'sprayShot',
      label: 'Spray Shot',
      shape: 'spray',
      targeting: 'areaTargets',
      requiresAttackType: 'ranged',
      source: 'Spray Shot',
      summary: 'Advisory ranged area/spray action. Exact affected squares and targets are spatial and GM/player adjudicated.'
    })];
  }

  if (normalized === 'flood of fire') {
    return [advisoryAreaRule({
      id: 'floodOfFire',
      label: 'Flood of Fire',
      shape: 'suppressionArea',
      targeting: 'areaTargets',
      requiresAttackType: 'ranged',
      source: 'Flood of Fire',
      summary: 'Advisory ranged area fire action. Spatial area, allies, enemies, and final affected targets remain GM/player adjudicated.'
    })];
  }

  if (normalized === 'forceful blast') {
    return [advisoryAreaRule({
      id: 'forcefulBlast',
      label: 'Forceful Blast',
      shape: 'blast',
      targeting: 'areaTargets',
      requiresAttackType: 'ranged',
      source: 'Forceful Blast',
      summary: 'Advisory blast/area action. Knockback or blast positioning is metadata only until spatial automation exists.'
    })];
  }

  if (normalized === 'strafe') {
    return [advisoryAreaRule({
      id: 'strafe',
      label: 'Strafe',
      shape: 'movementLine',
      targeting: 'lineOrPathTargets',
      requiresAttackType: 'ranged',
      source: 'Strafe',
      summary: 'Advisory movement-line area action. Flight/path geometry and affected squares remain GM/player adjudicated.'
    })];
  }

  if (normalized === 'mobility') {
    return [{
      type: 'MOVEMENT_DEFENSE_ADVISORY',
      id: 'mobility',
      label: 'Mobility',
      defenseModifier: {
        target: 'defense.reflex',
        type: 'dodge',
        value: 5,
        appliesAgainst: 'attacksOfOpportunityProvokedByMovement'
      },
      source: 'Mobility',
      summary: 'Advisory +5 dodge bonus to Reflex Defense against attacks of opportunity provoked by movement. Applied when the AoO workflow supplies that context.'
    }];
  }

  return null;
}

async function normalizeAreaExplosivesFeat(item, options = {}) {
  if (options?.swseAreaExplosivesFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
  if (!rules) return false;
  if (hasAreaExplosivesRule(item, item.name)) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'area_explosives_metadata',
      'system.abilityMeta.applicationScope': 'attack_option_or_advisory',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [
        ...getExistingRules(item),
        ...rules
      ]
    }], {
      source: 'AreaExplosivesFeatNormalization.normalize',
      swseAreaExplosivesFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[AreaExplosivesFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerAreaExplosivesFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeAreaExplosivesFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeAreaExplosivesFeat(item, options));
  SWSELogger.log('[AreaExplosivesFeatNormalization] Hooks registered');
}

export default registerAreaExplosivesFeatNormalizationHooks;
