/**
 * SWSE Houserule Presets
 * Pre-configured houserule bundles
 */

export const HOUSERULE_PRESETS = {
  coreRules: {
    name: "Core Rules Only",
    description: "Vanilla SWSE rules as written",
    settings: {
      // Character Creation
      characterCreation: {
        abilityScoreMethod: "4d6drop",
        pointBuyPool: 25,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [15, 14, 13, 12, 10, 8],
        allowReroll: false,
        rerollThreshold: 0,
        hpGeneration: "roll",
        maxHPLevels: 0
      },
      secondWindImproved: false,
      talentEveryLevel: false,
      deathSystem: {
        system: "standard",
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: "never",
        displayStrikes: false
      },
      crossClassSkillTraining: false,
      
      // Balance
      skillFocusRestriction: { useTheForce: 1, scaling: false },
      armoredDefenseForAll: false,
      weaponRangeMultiplier: 1.0,
      athleticsConsolidation: false,
      diagonalMovement: "swse",
      forcePointRecovery: "level",
      conditionTrackCap: 0,
      
      // Advanced
      knowledgeSkillMode: "standard",
      darkSideTemptation: false,
      trackBlasterCharges: false,
      criticalHitVariant: "standard",
      retrainingEnabled: false
    }
  },
  
  balanced: {
    name: "Balanced Campaign",
    description: "Community-recommended balance fixes",
    settings: {
      // Character Creation
      characterCreation: {
        abilityScoreMethod: "4d6drop",
        pointBuyPool: 28,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [15, 14, 13, 12, 10, 8],
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: "average_minimum",
        maxHPLevels: 1
      },
      secondWindImproved: true,
      talentEveryLevel: false,
      deathSystem: {
        system: "standard",
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: "never",
        displayStrikes: true
      },
      crossClassSkillTraining: false,
      
      // Balance
      skillFocusRestriction: { useTheForce: 8, scaling: false },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 0.5,
      athleticsConsolidation: true,
      diagonalMovement: "alternating",
      forcePointRecovery: "session",
      conditionTrackCap: 3,
      
      // Advanced
      knowledgeSkillMode: "consolidated4",
      darkSideTemptation: false,
      trackBlasterCharges: false,
      criticalHitVariant: "standard",
      retrainingEnabled: true
    }
  },
  
  heroic: {
    name: "Heroic Campaign",
    description: "High-powered cinematic Star Wars",
    settings: {
      // Character Creation
      characterCreation: {
        abilityScoreMethod: "4d6drop",
        pointBuyPool: 32,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [16, 14, 14, 12, 10, 8],
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: "maximum",
        maxHPLevels: 20
      },
      secondWindImproved: true,
      talentEveryLevel: true,
      deathSystem: {
        system: "threeStrikes",
        strikesUntilDeath: 3,
        returnToHP: 1,
        strikeRemoval: "long_rest",
        displayStrikes: true
      },
      crossClassSkillTraining: true,
      
      // Balance
      skillFocusRestriction: { useTheForce: 6, scaling: true },
      armoredDefenseForAll: true,
      weaponRangeMultiplier: 0.5,
      athleticsConsolidation: true,
      diagonalMovement: "simplified",
      forcePointRecovery: "encounter",
      conditionTrackCap: 2,
      
      // Advanced
      knowledgeSkillMode: "simplified2",
      darkSideTemptation: true,
      trackBlasterCharges: false,
      criticalHitVariant: "maxplus",
      retrainingEnabled: true
    }
  }
};

/**
 * Apply a preset configuration
 */
export async function applyPreset(presetName) {
  const preset = HOUSERULE_PRESETS[presetName];
  if (!preset) {
    ui.notifications.error(`Unknown preset: ${presetName}`);
    return;
  }
  
  console.log(`SWSE | Applying houserule preset: ${presetName}`);
  
  // Apply all settings
  for (const [key, value] of Object.entries(preset.settings)) {
    await game.settings.set("swse", key, value);
  }
  
  ui.notifications.info(`Applied ${preset.name} preset`);
  
  // Refresh all open sheets
  for (const app of Object.values(ui.windows)) {
    if (app.render) app.render();
  }
}

/**
 * Export current settings
 */
export function exportSettings() {
  const settings = {};
  
  const keys = [
    "characterCreation", "secondWindImproved", "talentEveryLevel",
    "deathSystem", "crossClassSkillTraining", "skillFocusRestriction",
    "armoredDefenseForAll", "weaponRangeMultiplier", "athleticsConsolidation",
    "diagonalMovement", "forcePointRecovery", "conditionTrackCap",
    "knowledgeSkillMode", "darkSideTemptation", "trackBlasterCharges",
    "criticalHitVariant", "retrainingEnabled"
  ];
  
  for (const key of keys) {
    settings[key] = game.settings.get("swse", key);
  }
  
  return settings;
}
