/**
 * Feat Suggestion Context
 *
 * Canonical helper for feat-suggestion-specific context:
 * - active slot context
 * - resolved feat/talent entitlements (including houserules)
 * - coarse timing for next general/class/talent choices
 * - class bonus feat lookup/set
 */

import { getActiveSlotContext } from "/systems/foundryvtt-swse/scripts/engine/suggestion/slot-context-detector.js";
import { FeatRulesAdapter } from "/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js";
import { HouseRuleTalentCombination } from "/systems/foundryvtt-swse/scripts/houserules/houserule-talent-combination.js";
import { ClassFeatRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/class-feat-registry.js";

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getCurrentLevel(actor, pendingData = {}) {
  return Number(pendingData?.plannedLevel || actor?.system?.level || 1) || 1;
}

function getSelectedClassName(actor, pendingData = {}) {
  return pendingData?.selectedClass?.name || actor?.items?.find?.(i => i.type === 'class')?.name || null;
}

function getSelectedClassLevel(actor, pendingData = {}) {
  const selectedName = normalizeName(getSelectedClassName(actor, pendingData));
  if (!selectedName) {
    return 0;
  }
  const classItem = actor?.items?.find?.((i) => i.type === 'class' && normalizeName(i.name) == selectedName);
  const currentLevel = Number(classItem?.system?.level || classItem?.system?.levels || 0) || 0;
  if (pendingData?.selectedClass?.name && !classItem) {
    return 1;
  }
  return currentLevel;
}

function levelsUntilNextGeneralFeat(level) {
  const nextChecks = [1, 3];
  if (level < 1) return 1;
  if (level < 3) return 3 - level;
  const mod = (level - 3) % 3;
  return mod === 0 ? 3 : 3 - mod;
}

function levelsUntilNextTalent(level) {
  if (level < 1) return 1;
  return level % 2 === 1 ? 2 : 1;
}

function levelsUntilNextClassBonusFeat(classLevel) {
  if (classLevel <= 0) return 1;
  return classLevel % 2 === 0 ? 2 : 1;
}

export function getResolvedFeatTalentEntitlements(actor, pendingData = {}) {
  const ownedFeats = new Set(
    (actor?.items || [])
      .filter((i) => i.type === 'feat')
      .map((i) => normalizeName(i.name))
      .filter(Boolean)
  );

  const ownedTalents = new Set(
    (actor?.items || [])
      .filter((i) => i.type === 'talent')
      .map((i) => normalizeName(i.name))
      .filter(Boolean)
  );

  for (const feat of pendingData?.selectedFeats || []) {
    ownedFeats.add(normalizeName(feat?.name || feat));
  }
  for (const feat of pendingData?.grantedFeats || []) {
    ownedFeats.add(normalizeName(feat?.name || feat));
  }
  for (const talent of pendingData?.selectedTalents || []) {
    const talentName = normalizeName(talent?.name || talent);
    if (talentName) {
      ownedTalents.add(talentName);
    }
    if (HouseRuleTalentCombination.isBlockDeflectCombined(talent?.name || talent)) {
      ownedTalents.add('block');
      ownedTalents.add('deflect');
      ownedTalents.add('block & deflect');
    }
  }
  for (const talent of pendingData?.grantedTalents || []) {
    const talentName = normalizeName(talent?.name || talent);
    if (talentName) {
      ownedTalents.add(talentName);
    }
  }

  const defaultFeatMap = {
    weaponFinesseDefault: 'Weapon Finesse',
    pointBlankShotDefault: 'Point-Blank Shot',
    powerAttackDefault: 'Power Attack',
    preciseShotDefault: 'Precise Shot',
    dodgeDefault: 'Dodge'
  };
  const enabledDefaults = FeatRulesAdapter.getEnabledDefaultFeats?.() || {};
  for (const [settingKey, featName] of Object.entries(defaultFeatMap)) {
    if (enabledDefaults?.[settingKey]) {
      ownedFeats.add(normalizeName(featName));
    }
  }

  if (HouseRuleTalentCombination.isBlockDeflectCombined('Block & Deflect')) {
    try {
      // Only set the aliases if the setting is actually combined.
      const actual = HouseRuleTalentCombination.getActualTalentsToGrant('Block & Deflect');
      if (Array.isArray(actual) && actual.length > 1) {
        ownedTalents.add('block');
        ownedTalents.add('deflect');
        ownedTalents.add('block & deflect');
      }
    } catch (_err) {
      // ignore setting access problems and leave talents unchanged
    }
  }

  return { ownedFeats, ownedTalents };
}

export async function buildFeatSuggestionContext(actor, pendingData = {}, options = {}) {
  const slotContext = options.slotContext || pendingData?.slotContext || getActiveSlotContext(actor, pendingData) || {
    slotKind: 'feat',
    slotType: 'heroic',
    classId: null,
    activeSlotIndex: 0,
  };

  const level = getCurrentLevel(actor, pendingData);
  const selectedClassLevel = getSelectedClassLevel(actor, pendingData);
  const selectedClassName = getSelectedClassName(actor, pendingData);
  const timing = {
    currentLevel: level,
    currentClassLevel: selectedClassLevel,
    levelsUntilNextGeneralFeat: levelsUntilNextGeneralFeat(level),
    levelsUntilNextTalent: levelsUntilNextTalent(level),
    levelsUntilNextClassBonusFeat: levelsUntilNextClassBonusFeat(selectedClassLevel),
  };

  const entitlements = getResolvedFeatTalentEntitlements(actor, pendingData);

  const lookupKeys = Array.isArray(options.classFeatLookupKeys)
    ? options.classFeatLookupKeys.filter(Boolean)
    : Array.isArray(pendingData?.classFeatLookupKeys)
      ? pendingData.classFeatLookupKeys.filter(Boolean)
      : [slotContext?.classId, selectedClassName].filter(Boolean);

  let classBonusFeatIds = new Set();
  if (lookupKeys.length > 0) {
    try {
      classBonusFeatIds = new Set(await ClassFeatRegistry.getClassBonusFeats(lookupKeys));
    } catch (_err) {
      classBonusFeatIds = new Set();
    }
  }

  return {
    mode: options.mode || pendingData?.mode || 'chargen',
    slotContext,
    timing,
    entitlements,
    classBonusFeatIds,
  };
}
