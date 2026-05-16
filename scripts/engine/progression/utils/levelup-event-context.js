/**
 * Level-Up Event Context
 *
 * Shared seam between the progression spine and level-up-only behavior.
 * Chargen asks "what identity is being created?"; level-up asks
 * "what class level and entitlements are owed by this advancement event?"
 *
 * This helper is intentionally read-only. It centralizes class-history and
 * selected-class interpretation so surveys, entitlement gates, finalization,
 * and recommendation context do not each guess independently.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { resolveClassModel } from './class-resolution.js';

export const BASE_CLASS_IDS = Object.freeze(['jedi', 'noble', 'scout', 'soldier', 'scoundrel']);

export function normalizeClassKey(value) {
  return String(value?.id || value?.classId || value?.sourceId || value?.name || value?.className || value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeNameKey(value) {
  return String(value?.name || value?.className || value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function readClassLevel(item) {
  return Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? item?.level ?? 0) || 0;
}

function getActorClassItems(actor) {
  return actor?.items?.filter?.((item) => item?.type === 'class') || [];
}

function getTotalActorLevel(actor) {
  const explicit = Number(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level ?? 0) || 0;
  const itemTotal = getActorClassItems(actor).reduce((sum, item) => sum + Math.max(0, readClassLevel(item)), 0);
  return Math.max(explicit, itemTotal, 0);
}

function isPrestigeClassModel(model) {
  return model?.prestigeClass === true || model?.baseClass === false || model?.system?.base_class === false;
}

function isBaseClassModel(model) {
  const modelKey = normalizeClassKey(model);
  const nameKey = normalizeNameKey(model);
  if (BASE_CLASS_IDS.includes(modelKey) || BASE_CLASS_IDS.includes(nameKey)) return true;
  if (model?.baseClass === true || model?.system?.base_class === true) return true;
  return !isPrestigeClassModel(model);
}

function findMatchingClassItem(actor, selectedClass, classModel = null) {
  const keys = new Set([
    normalizeClassKey(selectedClass),
    normalizeNameKey(selectedClass),
    normalizeClassKey(classModel),
    normalizeNameKey(classModel),
  ].filter(Boolean));

  return getActorClassItems(actor).find((item) => {
    const itemKeys = [
      normalizeClassKey(item),
      normalizeNameKey(item),
      normalizeClassKey(item?.system?.classId),
      normalizeNameKey(item?.system?.className),
      normalizeClassKey(item?.system?.sourceId),
    ].filter(Boolean);
    return itemKeys.some((key) => keys.has(key));
  }) || null;
}

function getPreviousClassItem(actor, selectedClass, classModel = null) {
  const matching = findMatchingClassItem(actor, selectedClass, classModel);
  const classes = getActorClassItems(actor);
  if (!classes.length) return null;
  return [...classes].reverse().find((item) => item?.id !== matching?.id) || classes[classes.length - 1] || null;
}

function getPreviousClassFromHistory(actor, selectedClass, classModel = null) {
  const history = Array.isArray(actor?.system?.progression?.classLevelHistory)
    ? actor.system.progression.classLevelHistory
    : [];
  if (!history.length) return null;
  const selectedKey = normalizeClassKey(classModel || selectedClass);
  const previous = [...history].reverse().find((entry) => normalizeClassKey(entry?.classId || entry?.className) !== selectedKey) || history[history.length - 1];
  if (!previous) return null;
  return {
    id: previous.classId || previous.className || 'history-class',
    name: previous.className || previous.classId || 'Previous Class',
    system: {
      classId: previous.classId,
      className: previous.className,
      level: previous.classLevel,
      base_class: previous.classType === 'base',
      prestigeClass: previous.classType === 'prestige',
    },
  };
}

function classifyPrestigeTransition(previousItem, selectedClass, classModel, existingItem) {
  const fromClassId = normalizeClassKey(previousItem?.system?.classId || previousItem?.name || previousItem?.id);
  const toClassId = normalizeClassKey(classModel || selectedClass);
  const fromType = previousItem
    ? (previousItem?.system?.base_class === false || previousItem?.system?.prestigeClass === true ? 'prestige' : 'base')
    : 'base';

  const ascensions = new Map([
    ['jedi_knight>jedi_master', 'ascension'],
    ['sith_apprentice>sith_lord', 'ascension'],
    ['force_adept>force_disciple', 'ascension'],
  ]);
  const pairKey = `${fromClassId}>${toClassId}`;
  const transitionKind = existingItem
    ? 'returningPrestige'
    : ascensions.get(pairKey)
      || (fromType === 'prestige' ? 'prestigeToPrestige' : 'firstPrestige');

  return {
    fromType,
    fromClassId,
    toClassId,
    transitionKind,
    isAscension: transitionKind === 'ascension',
  };
}

export function getSelectedClassFromSession(progressionSession = null) {
  return progressionSession?.getSelection?.('class')
    || progressionSession?.draftSelections?.class
    || null;
}

export function buildLevelUpEventContext(actor, progressionSession = null, options = {}) {
  const selectedClass = options.selectedClass || getSelectedClassFromSession(progressionSession);
  const classModel = resolveClassModel(selectedClass) || selectedClass || null;
  const currentLevel = getTotalActorLevel(actor) || Number(options.currentLevel || 0) || 0;
  const enteringLevel = Number(options.enteringLevel || currentLevel + 1) || 1;

  const existingItem = findMatchingClassItem(actor, selectedClass, classModel);
  const currentLevelsInSelectedClass = existingItem ? readClassLevel(existingItem) : 0;
  const selectedClassNextLevel = currentLevelsInSelectedClass + 1;
  const previousItem = getPreviousClassFromHistory(actor, selectedClass, classModel) || getPreviousClassItem(actor, selectedClass, classModel);

  const selectedClassType = isPrestigeClassModel(classModel) ? 'prestige' : 'base';
  const isNewClass = !existingItem;
  const isNewBaseClass = selectedClassType === 'base' && isNewClass && enteringLevel > 1;
  const isNewPrestigeClass = selectedClassType === 'prestige' && isNewClass;
  const prestigeTransition = selectedClassType === 'prestige'
    ? classifyPrestigeTransition(previousItem, selectedClass, classModel, existingItem)
    : null;

  const context = {
    mode: 'levelup',
    eventType: 'advanceOneLevel',
    currentLevel,
    enteringLevel,
    maxCharacterLevel: Number(options.maxCharacterLevel || 20),
    levelsRemainingAfterEntry: Math.max(0, Number(options.maxCharacterLevel || 20) - enteringLevel),

    selectedClass,
    selectedClassId: normalizeClassKey(classModel || selectedClass),
    selectedClassName: classModel?.name || selectedClass?.name || selectedClass?.className || null,
    selectedClassType,
    selectedClassCurrentLevel: currentLevelsInSelectedClass,
    selectedClassNextLevel,
    isNewClass,
    isReturningClass: !!existingItem,
    isNewBaseClass,
    isNewPrestigeClass,

    existingClassItemId: existingItem?.id || null,
    previousClassId: normalizeClassKey(previousItem?.system?.classId || previousItem?.name || previousItem?.id),
    previousClassName: previousItem?.name || null,
    prestigeTransition,
  };

  if (progressionSession) {
    progressionSession.levelUpContext = context;
  }

  swseLogger.debug('[LevelUpEventContext] Resolved level-up event', {
    actor: actor?.name,
    selectedClass: context.selectedClassName,
    selectedClassType: context.selectedClassType,
    classLevel: context.selectedClassNextLevel,
    isNewBaseClass,
    isNewPrestigeClass,
    transitionKind: prestigeTransition?.transitionKind || null,
  });

  return context;
}

export function getClassLevelProgressionEntry(classModel, level) {
  const entries = classModel?.levelProgression || classModel?.system?.level_progression || classModel?.system?.levelProgression || [];
  if (!Array.isArray(entries)) return null;
  return entries.find((entry) => Number(entry?.level) === Number(level)) || null;
}

export function countClassFeatureChoicesAtLevel(classModel, level, featureType) {
  const levelEntry = getClassLevelProgressionEntry(classModel, level);
  const features = Array.isArray(levelEntry?.features) ? levelEntry.features : [];
  return features
    .filter((feature) => String(feature?.type || '').toLowerCase() === String(featureType || '').toLowerCase())
    .reduce((sum, feature) => sum + Math.max(1, Number(feature?.value || 1)), 0);
}

export function actorHasClass(actor, classRef) {
  return !!findMatchingClassItem(actor, classRef, resolveClassModel(classRef));
}

export default {
  BASE_CLASS_IDS,
  normalizeClassKey,
  buildLevelUpEventContext,
  getSelectedClassFromSession,
  getClassLevelProgressionEntry,
  countClassFeatureChoicesAtLevel,
  actorHasClass,
};
