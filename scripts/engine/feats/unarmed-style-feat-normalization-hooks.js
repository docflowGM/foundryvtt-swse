import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const STYLE_FEAT_NAMES = new Set([
  'echani training',
  'hijkata training',
  "k'tara training",
  'ktara training',
  "k'thri training",
  'kthri training',
  'stava training',
  'tae-jitsu training',
  'tae jitsu training',
  'teras kasi training',
  'teräs käsi training',
  'wrruushi training'
]);

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasRule(rules, id, type) {
  const wanted = String(id ?? '');
  const wantedType = String(type ?? '').toUpperCase();
  return asArray(rules).some(rule => String(rule?.id ?? rule?.key ?? '') === wanted && String(rule?.type ?? '').toUpperCase() === wantedType);
}

function styleName(name) {
  const key = normalizeName(name);
  if (key === 'echani training') return 'echani';
  if (key === 'hijkata training') return 'hijkata';
  if (key === 'ktara training') return 'ktara';
  if (key === 'kthri training') return 'kthri';
  if (key === 'stava training') return 'stava';
  if (key === 'tae jitsu training') return 'taeJitsu';
  if (key === 'teras kasi training') return 'terasKasi';
  if (key === 'wrruushi training') return 'wrruushi';
  return null;
}

function baseRule(style, kind, data = {}) {
  return {
    type: `UNARMED_STYLE_${kind}`,
    id: `${style}${kind[0]}${kind.slice(1).toLowerCase()}`,
    style,
    appliesTo: 'virtual_unarmed_attack',
    consumedBy: 'UnarmedAttackHelper.buildVirtualUnarmedWeapon',
    ...data
  };
}

function echaniRules() {
  return [
    baseRule('echani', 'DAMAGE_ABILITY_MULTIPLIER', {
      id: 'echaniSingleUnarmedStrengthMultiplier',
      source: 'Echani Training',
      label: 'Echani Training: double Strength damage bonus on one unarmed attack',
      ability: 'str',
      multiplier: 2,
      minimumBonus: 1,
      requiresSingleUnarmedAttackThisTurn: true,
      oncePerTurn: true
    }),
    baseRule('echani', 'ON_DAMAGE_RIDER', {
      id: 'echaniKnockProneOncePerEncounter',
      source: 'Echani Training',
      label: 'Echani Training: Fortitude attack to knock prone',
      trigger: 'afterUnarmedDamage',
      frequency: 'encounter',
      actionType: 'free',
      attack: {
        type: 'unarmed',
        targetDefense: 'fortitude',
        dealsDamage: false
      },
      effect: {
        type: 'knockProne',
        duration: 'instant',
        maxTargetSizeDelta: 1,
        targetSizeDefenseBonuses: { large: 5, huge: 10, gargantuan: 20, colossal: 50 },
        stableTargetDefenseBonus: 5
      }
    })
  ];
}

function hijkataRules() {
  return [
    baseRule('hijkata', 'REACTION_ATTACK', {
      id: 'hijkataCounterOpportunityAttack',
      source: 'Hijkata Training',
      label: 'Hijkata Training: adjacent melee damage counterattack',
      trigger: 'damagedByAdjacentEnemyMeleeAttack',
      frequency: 'round',
      actionType: 'attackOfOpportunity',
      attack: { type: 'unarmed', attackPenalty: -5, target: 'triggeringEnemy' },
      provocationOverride: true
    }),
    baseRule('hijkata', 'ON_DAMAGE_RIDER', {
      id: 'hijkataOpportunityAttackPenaltyOncePerEncounter',
      source: 'Hijkata Training',
      label: 'Hijkata Training: Dex penalty on damaging unarmed AoO',
      trigger: 'afterDamagingUnarmedAttackOfOpportunity',
      frequency: 'encounter',
      effect: {
        type: 'attackRollPenalty',
        valueFormula: '-max(1, actor.dex.mod)',
        duration: 'untilEndOfNextTurn'
      }
    }),
    baseRule('hijkata', 'TALENT_SYNERGY', {
      id: 'hijkataExpertiseSynergySlot',
      source: 'Hijkata Training',
      talent: 'Hijkata Expertise',
      slot: 'designateAdjacentAllyGuardedAoO',
      actionType: 'full-round',
      frequency: 'encounter'
    })
  ];
}

function ktaraRules() {
  return [
    baseRule('ktara', 'CONDITIONAL_DAMAGE_DICE', {
      id: 'ktaraFlatFootedExtraDie',
      source: "K'tara Training",
      label: "K'tara Training: +1 die vs flat-footed target",
      dice: 1,
      frequency: 'turn',
      condition: { targetFlatFooted: true },
      attackLimit: 'oneUnarmedAttackDuringTurn'
    }),
    baseRule('ktara', 'ON_DAMAGE_RIDER', {
      id: 'ktaraSilenceStunningOncePerEncounter',
      source: "K'tara Training",
      label: "K'tara Training: Fortitude attack to silence",
      trigger: 'afterUnarmedDamageToDeniedDexTarget',
      frequency: 'encounter',
      actionType: 'free',
      attack: { type: 'unarmed', targetDefense: 'fortitude', dealsDamage: false },
      effect: {
        type: 'cannotSpeak',
        duration: 'untilEndOfNextTurn',
        traits: ['stunning']
      }
    }),
    baseRule('ktara', 'TALENT_SYNERGY', {
      id: 'ktaraExpertiseSynergySlot',
      source: "K'tara Training",
      talent: "K'tara Expertise",
      slot: 'twoSwiftActionsFlatFootAdjacentEnemy',
      actionType: 'two-swift'
    })
  ];
}

function kthriRules() {
  return [
    baseRule('kthri', 'ACTION_ATTACK', {
      id: 'kthriSwiftUnarmedAttack',
      source: "K'thri Training",
      label: "K'thri Training: swift unarmed attack",
      actionType: 'swift',
      frequency: 'round',
      attack: {
        type: 'unarmed',
        target: 'enemyWithinReach',
        damageMode: 'baseUnarmedOnly',
        suppressStrengthDamage: true,
        suppressHeroicLevelDamage: true
      },
      armorRequirement: ['none', 'light']
    }),
    baseRule('kthri', 'MISS_RIDER', {
      id: 'kthriHalfDamageOnMissOncePerEncounter',
      source: "K'thri Training",
      label: "K'thri Training: half damage on missed unarmed attack",
      frequency: 'encounter',
      trigger: 'missedUnarmedAttack',
      damageMultiplier: 0.5,
      armorRequirement: ['none', 'light']
    }),
    baseRule('kthri', 'TALENT_SYNERGY', {
      id: 'kthriExpertiseSynergySlot',
      source: "K'thri Training",
      talent: "K'thri Expertise",
      slot: 'fullAttackUnarmedRerollOneAttack',
      frequency: 'encounter',
      armorRequirement: ['none', 'light']
    })
  ];
}

function stavaRules() {
  return [
    baseRule('stava', 'GRAPPLE_MUTATOR', {
      id: 'stavaGrabSizeIncrease',
      source: 'Stava Training',
      label: 'Stava Training: grab/grapple size increase',
      grabTargetSizeCategoryBonus: 1,
      grappleSizeModifierCategoryBonus: 1,
      armorRequirement: ['none', 'light']
    }),
    baseRule('stava', 'ON_HIT_RIDER', {
      id: 'stavaChargeFreeGrab',
      source: 'Stava Training',
      label: 'Stava Training: free grab after charging unarmed hit',
      trigger: 'successfulUnarmedChargeAttack',
      actionType: 'free',
      effect: { type: 'freeGrabAttempt', target: 'hitTarget' },
      armorRequirement: ['none', 'light']
    }),
    baseRule('stava', 'TALENT_SYNERGY', {
      id: 'stavaExpertiseSynergySlot',
      source: 'Stava Training',
      talent: 'Stava Expertise',
      slot: 'addStrengthAndDexterityToGrappleChecks',
      armorRequirement: ['none', 'light']
    })
  ];
}

function taeJitsuRules() {
  return [
    baseRule('taeJitsu', 'CRITICAL_DAMAGE_STEP', {
      id: 'taeJitsuCriticalUnarmedDamageStep',
      source: 'Tae-Jitsu Training',
      label: 'Tae-Jitsu Training: critical unarmed damage +1 die step',
      trigger: 'unarmedCriticalHit',
      value: 1,
      maxPrimaryDie: 'd12'
    }),
    baseRule('taeJitsu', 'ACTION_MARK', {
      id: 'taeJitsuPrimaryAdversary',
      source: 'Tae-Jitsu Training',
      label: 'Tae-Jitsu Training: designate primary adversary',
      trigger: 'afterSuccessfulUnarmedAttack',
      frequency: 'encounter',
      actionType: 'swift',
      effect: {
        type: 'primaryAdversaryDesignation',
        duration: 'encounter',
        grantsDodgeAgainstPrimaryAndOneOther: true
      }
    }),
    baseRule('taeJitsu', 'TALENT_SYNERGY', {
      id: 'taeJitsuExpertiseSynergySlot',
      source: 'Tae-Jitsu Training',
      talent: 'Tae-Jitsu Expertise',
      slot: 'criticalVsPrimaryAdversaryAttackPenalty',
      penalty: -2,
      duration: 'untilEndOfNextTurn'
    })
  ];
}

function terasKasiRules() {
  return [
    baseRule('terasKasi', 'ON_HIT_MUTATOR', {
      id: 'terasKasiDamageThresholdReduction',
      source: 'Teras Kasi Training',
      label: 'Teras Kasi Training: reduce target DT by 5 for this attack',
      trigger: 'successfulUnarmedAttack',
      frequency: 'round',
      damageThresholdModifier: -5,
      appliesOnlyForCurrentAttackResolution: true
    }),
    baseRule('terasKasi', 'TALENT_SYNERGY', {
      id: 'terasKasiBasicsSynergySlot',
      source: 'Teras Kasi Training',
      talent: 'Teras Kasi Basics',
      slot: 'virtualUnarmedDamageSizeCategoryIncrease',
      damageSizeCategoryBonus: 1
    })
  ];
}

function wrruushiRules() {
  return [
    baseRule('wrruushi', 'ON_HIT_RIDER', {
      id: 'wrruushiTemporaryHitPoints',
      source: 'Wrruushi Training',
      label: 'Wrruushi Training: temporary hit points on unarmed hit',
      trigger: 'successfulUnarmedAttack',
      frequency: 'round',
      bonusHitPointsFormula: 'actor.con.mod',
      bonusHitPointsMinimum: 0,
      stacking: 'replace',
      duration: 'encounter',
      armorRequirement: ['none', 'light']
    }),
    baseRule('wrruushi', 'ALTERNATE_DEFENSE_ATTACK', {
      id: 'wrruushiFortitudeUnarmedAttackOncePerEncounter',
      source: 'Wrruushi Training',
      label: 'Wrruushi Training: unarmed attack vs Fortitude',
      frequency: 'encounter',
      attack: { type: 'unarmed', targetDefense: 'fortitude', dealsDamage: true },
      effect: {
        type: 'suppressFortitudeEquipmentBonus',
        duration: 'encounter'
      },
      armorRequirement: ['none', 'light']
    }),
    baseRule('wrruushi', 'TALENT_SYNERGY', {
      id: 'wrruushiExpertiseSynergySlot',
      source: 'Wrruushi Training',
      talent: 'Wrruushi Expertise',
      slot: 'criticalUnarmedConditionTrackMinusTwo',
      conditionTrackDelta: -2,
      armorRequirement: ['none', 'light']
    })
  ];
}

function styleRules(style) {
  switch (style) {
    case 'echani': return echaniRules();
    case 'hijkata': return hijkataRules();
    case 'ktara': return ktaraRules();
    case 'kthri': return kthriRules();
    case 'stava': return stavaRules();
    case 'taeJitsu': return taeJitsuRules();
    case 'terasKasi': return terasKasiRules();
    case 'wrruushi': return wrruushiRules();
    default: return [];
  }
}

async function normalizeUnarmedStyleFeat(item, options = {}) {
  if (options?.swseUnarmedStyleNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const normalized = normalizeName(item.name);
  if (!STYLE_FEAT_NAMES.has(normalized)) return false;
  const style = styleName(item.name);
  if (!style) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const additions = [];
  for (const rule of styleRules(style)) {
    if (!hasRule(currentRules, rule.id, rule.type)) additions.push(rule);
  }
  const modelChanged = item.system?.executionModel !== 'PASSIVE'
    || item.system?.subType !== 'STATE'
    || item.system?.abilityMeta?.mechanicsMode !== 'unarmed_virtual_attack_style'
    || item.system?.abilityMeta?.applicationScope !== 'virtual_unarmed_attack'
    || item.system?.abilityMeta?.staticSheetPolicy !== 'include';
  if (!additions.length && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'STATE',
      'system.abilityMeta.mechanicsMode': 'unarmed_virtual_attack_style',
      'system.abilityMeta.applicationScope': 'virtual_unarmed_attack',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.rules': [...currentRules, ...additions]
    }], {
      source: 'UnarmedStyle.normalization',
      swseUnarmedStyleNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[UnarmedStyleNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerUnarmedStyleFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeUnarmedStyleFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeUnarmedStyleFeat(item, options));
  SWSELogger.log('[UnarmedStyleNormalization] Hooks registered');
}

export default registerUnarmedStyleFeatNormalizationHooks;
