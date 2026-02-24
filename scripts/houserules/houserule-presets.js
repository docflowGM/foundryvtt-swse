// scripts/houserules/houserule-presets.js
import { SWSELogger } from '../utils/logger.js';

/**
 * CENTRAL DEFINITIONS FOR PRESET BUNDLES
 * These define the defaults; the application logic below will enforce safety,
 * deep-merge nested objects, and apply only known houserule keys.
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
 * Only apply values for settings that actually exist in Foundry.
 * Prevents world corruption if presets contain old or unused fields.
 */
function isValidSetting(key) {
  const fullPath = `foundryvtt-swse.${key}`;
  return game.settings.storage.get('world')?.has(fullPath);
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
      const current = game.settings.get('foundryvtt-swse', key);
      const merged = typeof value === 'object' && !Array.isArray(value)
        ? deepMerge(structuredClone(current ?? {}), value)
        : value;

      await game.settings.set('foundryvtt-swse', key, merged);
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
      out[key] = game.settings.get('foundryvtt-swse', key);
    } catch (err) {
      SWSELogger.warn(`Skipping unknown houserule key during export: ${key}`);
    }
  }

  return out;
}
