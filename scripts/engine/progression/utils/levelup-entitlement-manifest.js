/**
 * Level-Up Entitlement Manifest
 *
 * Receiving-dock authority for one level-up event. This helper is read-only:
 * it compiles what RAW says the selected level should grant before the
 * finalizer materializes anything onto the actor.
 */

import {
  buildLevelUpEventContext,
  getClassLevelProgressionEntry,
  normalizeClassKey,
} from './levelup-event-context.js';
import { resolveClassModel } from './class-resolution.js';
import { ProgressionRules } from '../ProgressionRules.js';
import { ProgressionContentAuthority } from '../content/progression-content-authority.js';

const CHOICE_TYPES = Object.freeze({
  feat_choice: 'classFeatChoices',
  talent_choice: 'talentChoices',
  force_power_choice: 'forcePowerChoices',
  force_secret_choice: 'forceSecretChoices',
  force_technique_choice: 'forceTechniqueChoices',
  medical_secret_choice: 'medicalSecretChoices',
  starship_maneuver_choice: 'starshipManeuverChoices',
});

const NON_MATERIALIZED_FEATURES = new Set([
  'defense bonuses',
  'defense bonus',
  'starting feats',
]);

function normalizeName(value) {
  return String(value?.name || value?.label || value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function featureType(feature) {
  return String(feature?.type || feature?.kind || '')
    .trim()
    .toLowerCase();
}

function featureQuantity(feature) {
  return Math.max(1, Number(feature?.value ?? feature?.quantity ?? feature?.count ?? 1) || 1);
}

function classSkillEntriesFromClass(model, source = 'class') {
  const className = model?.name || model?.className || model?.id || 'Class';
  const classId = normalizeClassKey(model);
  const skills = model?.classSkills || model?.system?.classSkills || model?.system?.class_skills || [];
  return (Array.isArray(skills) ? skills : [])
    .map(skill => {
      const resolved = ProgressionContentAuthority.resolveSkill?.(skill) || null;
      const id = String(resolved?.id || resolved?._id || skill?.id || skill?._id || skill?.key || skill?.name || skill || '').trim();
      const key = String(resolved?.key || resolved?.id || resolved?._id || skill?.key || id || '').trim();
      if (!id || !key) return null;
      return {
        id,
        key,
        name: resolved?.name || resolved?.label || skill?.name || skill?.label || String(skill),
        classId,
        className,
        source,
      };
    })
    .filter(Boolean);
}

function actorClassItems(actor) {
  return actor?.items?.filter?.(item => item?.type === 'class') || [];
}

function getOwnedClassSkillEntries(actor, selectedClassModel = null) {
  const byKey = new Map();
  for (const item of actorClassItems(actor)) {
    const model = resolveClassModel(item) || item;
    for (const entry of classSkillEntriesFromClass(model, 'owned-class')) {
      if (!byKey.has(entry.id)) byKey.set(entry.id, entry);
    }
  }
  if (selectedClassModel) {
    for (const entry of classSkillEntriesFromClass(selectedClassModel, 'selected-class')) {
      if (!byKey.has(entry.id)) byKey.set(entry.id, entry);
    }
  }
  return Array.from(byKey.values());
}

function normalizeStartingFeature(feature, classModel) {
  const name = feature?.name || feature?.label || String(feature || '').trim();
  if (!name) return null;
  return {
    id: feature?.id || feature?._id || feature?.slug || name,
    name,
    type: 'feat',
    sourceType: 'multiclass-starting-feat',
    classId: normalizeClassKey(classModel),
    className: classModel?.name || classModel?.className || null,
    system: {
      ...(feature?.system || {}),
      sourceType: 'class',
      grantedByClass: true,
      multiclassStartingFeat: true,
      locked: true,
      choiceEditable: false,
    },
  };
}

function getStartingFeatOptions(classModel) {
  const startingFeatures = classModel?.startingFeatures || classModel?.system?.starting_features || classModel?.system?.startingFeatures || [];
  return (Array.isArray(startingFeatures) ? startingFeatures : [])
    .filter(feature => {
      const type = featureType(feature);
      return type === 'feat' || type === 'proficiency' || type === 'feat_grant' || type === 'starting_feat' || !type;
    })
    .map(feature => normalizeStartingFeature(feature, classModel))
    .filter(Boolean);
}

function isMaterializedAutomaticFeature(feature) {
  const type = featureType(feature);
  const name = normalizeName(feature);
  if (!name || NON_MATERIALIZED_FEATURES.has(name)) return false;
  if (type.endsWith('_choice') || type === 'feat_choice' || type === 'talent_choice') return false;
  if (type === 'feat_grant') return false;
  return ['class_feature', 'scaling_feature', 'special_ability', 'feature', 'grant'].includes(type);
}

function normalizeAutomaticFeature(feature, classModel, context) {
  const name = feature?.name || feature?.label || String(feature || '').trim();
  if (!name || !isMaterializedAutomaticFeature(feature)) return null;
  const type = featureType(feature) || 'class_feature';
  return {
    id: feature?.id || feature?._id || feature?.slug || `${normalizeClassKey(classModel)}-${context.selectedClassNextLevel}-${name}`,
    name,
    type: 'feat',
    featureType: type,
    classId: context.selectedClassId,
    className: context.selectedClassName || classModel?.name || null,
    classLevel: context.selectedClassNextLevel,
    characterLevel: context.enteringLevel,
    system: {
      ...(feature?.system || {}),
      description: feature?.description || feature?.details || feature?.text || '',
      sourceType: 'class-feature',
      classFeature: true,
      autoGranted: true,
      grantedByClass: true,
      grantedClassLevel: context.selectedClassNextLevel,
      progressionFeatureType: type,
      value: feature?.value ?? feature?.rank ?? null,
      locked: true,
      choiceEditable: false,
    },
  };
}

function countChoices(features = []) {
  const counts = {
    classFeatChoices: 0,
    talentChoices: 0,
    forcePowerChoices: 0,
    forceSecretChoices: 0,
    forceTechniqueChoices: 0,
    medicalSecretChoices: 0,
    starshipManeuverChoices: 0,
  };
  for (const feature of features || []) {
    const key = CHOICE_TYPES[featureType(feature)];
    if (!key) continue;
    counts[key] += featureQuantity(feature);
  }
  return counts;
}

export function buildLevelUpEntitlementManifest(actor, progressionSession = null, options = {}) {
  const selectedClass = options.selectedClass || progressionSession?.getSelection?.('class') || progressionSession?.draftSelections?.class || null;
  const classModel = resolveClassModel(selectedClass) || selectedClass || null;
  const context = buildLevelUpEventContext(actor, progressionSession, { selectedClass });
  const levelEntry = getClassLevelProgressionEntry(classModel, context.selectedClassNextLevel) || {};
  const features = Array.isArray(levelEntry.features) ? levelEntry.features : [];
  const choices = countChoices(features);
  const startingFeatOptions = getStartingFeatOptions(classModel);
  const multiclassStartingFeatRequired = context.isNewBaseClass
    && startingFeatOptions.length > 0
    && ProgressionRules.multiclassExtraStartingFeatsEnabled?.() !== true;

  const automaticClassFeatures = features
    .map(feature => normalizeAutomaticFeature(feature, classModel, context))
    .filter(Boolean);

  const classSkills = getOwnedClassSkillEntries(actor, classModel);
  const enteringLevel = Number(context.enteringLevel || 0) || 0;
  const abilityIncreaseCount = enteringLevel > 1 && enteringLevel % 4 === 0 ? 2 : 0;
  const generalFeatCount = enteringLevel > 1 && enteringLevel % 3 === 0 ? 1 : 0;

  return {
    kind: 'swse-level-up-entitlement-manifest',
    version: 1,
    context,
    classId: context.selectedClassId,
    className: context.selectedClassName,
    classLevel: context.selectedClassNextLevel,
    characterLevel: context.enteringLevel,
    classType: context.selectedClassType,
    isNewBaseClass: !!context.isNewBaseClass,
    isNewPrestigeClass: !!context.isNewPrestigeClass,
    levelFeatures: features,
    choices,
    generalFeat: {
      required: generalFeatCount > 0,
      count: generalFeatCount,
    },
    abilityIncreases: {
      required: abilityIncreaseCount > 0,
      count: abilityIncreaseCount,
      distinct: true,
      reason: abilityIncreaseCount > 0 ? `Character level ${enteringLevel}` : null,
    },
    multiclassStartingFeat: {
      required: multiclassStartingFeatRequired,
      count: multiclassStartingFeatRequired ? 1 : 0,
      options: startingFeatOptions,
    },
    automaticClassFeatures,
    classSkills,
  };
}

export function getManifestStartingFeatNameSet(manifest) {
  return new Set((manifest?.multiclassStartingFeat?.options || [])
    .map(option => normalizeName(option?.name || option?.id))
    .filter(Boolean));
}

export function normalizeManifestName(value) {
  return normalizeName(value);
}

export default {
  buildLevelUpEntitlementManifest,
  getManifestStartingFeatNameSet,
  normalizeManifestName,
};
