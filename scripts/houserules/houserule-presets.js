// scripts/houserules/houserule-presets.js
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

/**
 * CENTRAL DEFINITIONS FOR PRESET BUNDLES
 *
 * Each preset must only use top-level registered setting keys.
 * Nested objects (characterCreation, deathSystem, skillFocusRestriction) are
 * deep-merged so partial overrides do not destroy unset sub-keys.
 *
 * Status tags for reference: wired | partial | unwired | experimental
 */

export const HOUSERULE_PRESETS = {
  coreRules: {
    name: 'Core Rules Only',
    description: 'Vanilla SWSE rules as written',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 25,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [15, 14, 13, 12, 10, 8],
        allowReroll: false,
        rerollThreshold: 0,
        hpGeneration: 'roll',
        maxHPLevels: 0
      },
      secondWindImproved: false,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: false
      },
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 1, scaling: false },
      armoredDefenseForAll: false,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'standard',
      trackBlasterCharges: false,
      diagonalMovement: 'swse',
      forcePointRecovery: 'level',
      conditionTrackCap: 0,
      darkSideTemptation: 'strict',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: false
    }
  },

  balanced: {
    name: 'Balanced Campaign',
    description: 'Community-recommended balance fixes.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 28,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [15, 14, 13, 12, 10, 8],
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'average_minimum',
        maxHPLevels: 1
      },
      secondWindImproved: true,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: true
      },
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 8, scaling: false },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 0.5,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'consolidated',
      trackBlasterCharges: false,
      diagonalMovement: 'alternating',
      forcePointRecovery: 'session',
      conditionTrackCap: 3,
      darkSideTemptation: 'lenient',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: true
    }
  },

  heroic: {
    name: 'Heroic Campaign',
    description: 'High-powered cinematic Star Wars.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 32,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [16, 14, 14, 12, 10, 8],
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'maximum',
        maxHPLevels: 20
      },
      secondWindImproved: true,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: true,
      deathSystem: {
        system: 'threeStrikes',
        strikesUntilDeath: 3,
        returnToHP: 1,
        strikeRemoval: 'long_rest',
        displayStrikes: true
      },
      crossClassSkillTraining: true,
      skillFocusRestriction: { useTheForce: 6, scaling: true },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 0.5,
      athleticsConsolidation: true,
      knowledgeSkillMode: 'simplified',
      trackBlasterCharges: true,
      diagonalMovement: 'simplified',
      forcePointRecovery: 'session',
      conditionTrackCap: 2,
      darkSideTemptation: 'narrative',
      darkSidePowerIncreaseScore: false,
      criticalHitVariant: 'maxplus',
      retrainingEnabled: true
    }
  },

  // ─── TACTICAL VTT ─────────────────────────────────────────────────────────
  tacticalVTT: {
    name: 'Tactical VTT',
    description: 'Assumes tokens on canvas, measured ranges, ammo tracking, and action enforcement. Best for fully automated tabletop play.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 28,
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'average_minimum',
        maxHPLevels: 1
      },
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: false,
        deathAtNegativeCon: false,
        massiveDamageThreshold: 0
      },
      secondWindImproved: false,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 1, scaling: false },
      armoredDefenseForAll: false,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'standard',
      trackBlasterCharges: true,
      diagonalMovement: 'alternating',
      fightDefensivelyActionMode: 'default',
      flankingEnabled: true,
      flankingBonus: 'plusTwo',
      flankingRequiresConsciousness: true,
      flankingDiagonalCounts: false,
      forcePointRecovery: 'level',
      conditionTrackCap: 0,
      darkSideTemptation: 'strict',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: false,
      enableEnhancedMassiveDamage: false,
      conditionTrackEnabled: false,
      statusEffectsEnabled: true,
      statusEffectDurationTracking: 'rounds'
    }
  },

  // ─── THEATER OF THE MIND ──────────────────────────────────────────────────
  theaterOfTheMind: {
    name: 'Theater of the Mind',
    description: 'No token enforcement. Range and movement are adjudicated by GM. Simpler, faster play with fewer automation dependencies.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 28,
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'average_minimum',
        maxHPLevels: 1
      },
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: false,
        deathAtNegativeCon: false,
        massiveDamageThreshold: 0
      },
      secondWindImproved: true,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 8, scaling: false },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'standard',
      trackBlasterCharges: false,
      diagonalMovement: 'simplified',
      fightDefensivelyActionMode: 'rai',
      flankingEnabled: false,
      forcePointRecovery: 'session',
      conditionTrackCap: 3,
      darkSideTemptation: 'lenient',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: true,
      enableEnhancedMassiveDamage: false
    }
  },

  // ─── GRITTY / SIMULATIONIST ───────────────────────────────────────────────
  gritty: {
    name: 'Gritty / Simulationist',
    description: 'Ammo tracked, slower recovery, harsher wounds, more logistics. For campaigns that emphasize danger and resource management.',
    settings: {
      characterCreation: {
        abilityScoreMethod: 'organic',
        pointBuyPool: 25,
        allowReroll: false,
        rerollThreshold: 0,
        hpGeneration: 'roll',
        maxHPLevels: 0
      },
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: false,
        deathAtNegativeCon: false,
        massiveDamageThreshold: 0
      },
      secondWindImproved: false,
      secondWindRecovery: 'extended',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 1, scaling: false },
      armoredDefenseForAll: false,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'standard',
      trackBlasterCharges: true,
      diagonalMovement: 'alternating',
      fightDefensivelyActionMode: 'default',
      flankingEnabled: true,
      flankingBonus: 'plusTwo',
      flankingRequiresConsciousness: true,
      forcePointRecovery: 'level',
      conditionTrackCap: 0,
      darkSideTemptation: 'strict',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: false,
      enableEnhancedMassiveDamage: true,
      persistentDTPenalty: true,
      persistentDTPenaltyCap: 3,
      doubleThresholdPenalty: true,
      eliminateInstantDeath: false
    }
  },

  // ─── FORCE-CINEMATIC ──────────────────────────────────────────────────────
  forceCinematic: {
    name: 'Force-Cinematic',
    description: 'Flexible Force suite reselection, Force point recovery each session, narrative dark side mode. For campaigns where the Force is central.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 30,
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'average_minimum',
        maxHPLevels: 1
      },
      deathSystem: {
        system: 'threeStrikes',
        strikesUntilDeath: 3,
        returnToHP: 1,
        strikeRemoval: 'long_rest',
        displayStrikes: true,
        deathAtNegativeCon: false,
        massiveDamageThreshold: 0
      },
      secondWindImproved: true,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 6, scaling: true },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 0.5,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'consolidated',
      trackBlasterCharges: false,
      diagonalMovement: 'alternating',
      fightDefensivelyActionMode: 'rai',
      forcePointRecovery: 'session',
      conditionTrackCap: 2,
      darkSideTemptation: 'narrative',
      darkSidePowerIncreaseScore: false,
      allowSuiteReselection: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: true,
      enableEnhancedMassiveDamage: false,
      eliminateInstantDeath: true
    }
  },

  // ─── VEHICLE-HEAVY CAMPAIGN ───────────────────────────────────────────────
  vehicleHeavy: {
    name: 'Vehicle-Heavy Campaign',
    description: 'Enables SWES subsystems, directional shields, pilot/engineer/commander roles, and vehicle turn controller. Best for space-focused campaigns.',
    settings: {
      characterCreation: {
        abilityScoreMethod: '4d6drop',
        pointBuyPool: 28,
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: 'average_minimum',
        maxHPLevels: 1
      },
      deathSystem: {
        system: 'standard',
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: 'never',
        displayStrikes: false,
        deathAtNegativeCon: false,
        massiveDamageThreshold: 0
      },
      secondWindImproved: false,
      secondWindRecovery: 'encounter',
      secondWindWebEnhancement: false,
      talentEveryLevel: false,
      crossClassSkillTraining: false,
      skillFocusRestriction: { useTheForce: 1, scaling: false },
      armoredDefenseForAll: false,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      knowledgeSkillMode: 'standard',
      trackBlasterCharges: true,
      diagonalMovement: 'swse',
      forcePointRecovery: 'level',
      conditionTrackCap: 0,
      darkSideTemptation: 'strict',
      darkSidePowerIncreaseScore: true,
      criticalHitVariant: 'standard',
      retrainingEnabled: false,
      enableScaleEngine: true,
      enableSWES: true,
      enableEnhancedShields: true,
      enableEnhancedEngineer: true,
      enableEnhancedPilot: true,
      enableEnhancedCommander: true,
      enableVehicleTurnController: true,
      enableLastGrasp: true,
      enableEmergencyPatch: true,
      enableSubsystemRepairCost: true,
      spaceInitiativeSystem: 'shipBased'
    }
  }
};

/* -------------------------------------------------------------------------- */
/*                     INTERNAL VALIDATION & SAFETY LAYERS                     */
/* -------------------------------------------------------------------------- */

/**
 * Deep merge for nested preset objects.
 * Ensures partial overrides do not destroy missing keys.
 */
function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] ?? {}, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

/**
 * Only apply values for settings that are registered in the Foundry settings registry.
 * Uses the registry (game.settings.settings) so settings with default values that
 * have never been explicitly saved to world storage are still recognised.
 */
function isValidSetting(key) {
  const fullKey = `foundryvtt-swse.${key}`;
  return game.settings.settings?.has(fullKey) ?? false;
}

/* -------------------------------------------------------------------------- */
/*                     APPLY PRESET (UPGRADED & SAFE)                         */
/* -------------------------------------------------------------------------- */

export async function applyPreset(presetName) {
  const preset = HOUSERULE_PRESETS[presetName];

  if (!preset) {
    ui.notifications.error(`Unknown preset: ${presetName}`);
    return;
  }

  SWSELogger.info(`Applying SWSE preset: ${presetName}`);

  const entries = Object.entries(preset.settings);

  for (const [key, value] of entries) {
    if (!isValidSetting(key)) {
      SWSELogger.warn(`Preset attempted to set unknown rule: ${key}`);
      continue;
    }

    try {
      const current = HouseRuleService.getSafe(key, null);
      const merged = typeof value === 'object' && !Array.isArray(value)
        ? deepMerge(structuredClone(current ?? {}), value)
        : value;

      await HouseRuleService.set(key, merged);
    } catch (err) {
      SWSELogger.error(`Failed to set preset key "${key}"`, err);
    }
  }

  ui.notifications.info(`Applied preset: ${preset.name}`);

  // Re-render all open apps to reflect changes
  for (const app of Object.values(ui.windows)) {
    try {
      app.render();
    } catch (_) {}
  }
}

/* -------------------------------------------------------------------------- */
/*                               EXPORT SETTINGS                               */
/* -------------------------------------------------------------------------- */

export function exportSettings() {
  const allowedKeys = [
    'characterCreation',
    'secondWindImproved',
    'secondWindRecovery',
    'secondWindWebEnhancement',
    'talentEveryLevel',
    'deathSystem',
    'crossClassSkillTraining',
    'skillFocusRestriction',
    'armoredDefenseForAll',
    'weaponRangeMultiplier',
    'athleticsConsolidation',
    'knowledgeSkillMode',
    'trackBlasterCharges',
    'diagonalMovement',
    'forcePointRecovery',
    'conditionTrackCap',
    'darkSideTemptation',
    'darkSidePowerIncreaseScore',
    'criticalHitVariant',
    'retrainingEnabled'
  ];

  const out = {};

  for (const key of allowedKeys) {
    try {
      out[key] = HouseRuleService.getSafe(key, null);
    } catch (err) {
      SWSELogger.warn(`Skipping unknown houserule key during export: ${key}`);
    }
  }

  return out;
}
