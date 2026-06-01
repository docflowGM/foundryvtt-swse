/**
 * Droid Builder View Model Adapter
 *
 * Converts the existing progression droid-builder state and DROID_SYSTEMS data
 * into a Garage-style three-rail construction model.
 *
 * This file is intentionally presentation/adaptation only. It does not mutate
 * actor data, purchase systems, remove systems, or create a second droid data
 * authority. The existing DroidBuilderStep remains responsible for state changes.
 */

import { DROID_SYSTEMS } from '../../../data/droid-systems.js';
import {
  DROID_DEGREE_PACKAGES,
  DROID_SIZE_PACKAGES,
  combineDroidAbilityMods,
  getDroidDegreePackage,
  getDroidSizeCostFactor,
  getDroidSizePackage,
} from '../../../engine/progression/droids/droid-trait-rules.js';

const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
const CATEGORY_LABELS = {
  locomotion: 'Locomotion',
  processor: 'Processor',
  appendage: 'Appendages',
  accessory: 'Accessories',
  enhancement: 'Enhancements',
  locomotionEnhancement: 'Locomotion Enhancements',
  appendageEnhancement: 'Appendage Enhancements',
};

const CATEGORY_DESCRIPTIONS = {
  locomotion: 'Movement platform and mobility profile.',
  processor: 'Core processor and behavioral architecture.',
  appendage: 'Manipulators, claws, tools, and mounts.',
  accessory: 'Optional installed droid systems and equipment.',
  locomotionEnhancement: 'Enhancements that modify the active locomotion package.',
  appendageEnhancement: 'Enhancements that modify installed appendages.',
};

const REQUIRED_GROUPS = new Set(['locomotion', 'processor', 'appendage']);

export const DROID_BUILDER_CONTEXT_PROFILES = Object.freeze({
  chargenDraft: {
    id: 'chargenDraft',
    modeClass: 'chargen-draft',
    hostKind: 'progression',
    hudLabel: 'GARAGE CONSTRUCTION MODE',
    hostLabel: 'Progression Draft',
    modeLabel: 'Construction Draft',
    railLabel: 'Current Build',
    actionRailLabel: 'Action Rail',
    validationLabel: 'Build Status',
    subtitle: 'Garage construction mode for first-time droid assembly.',
    description: 'Used by droid character creation and other first-time droid build flows.',
  },
  buildNew: {
    id: 'buildNew',
    modeClass: 'build-new',
    hostKind: 'garage',
    hudLabel: 'GARAGE BUILD MODE',
    hostLabel: 'New Droid',
    modeLabel: 'New Build',
    railLabel: 'Current Build',
    actionRailLabel: 'Action Rail',
    validationLabel: 'Build Status',
    subtitle: 'Garage construction mode for a new droid chassis.',
    description: 'Used when the Garage hosts a first-time droid build outside progression.',
  },
  modifyExisting: {
    id: 'modifyExisting',
    modeClass: 'modify-existing',
    hostKind: 'garage',
    hudLabel: 'GARAGE MODIFICATION MODE',
    hostLabel: 'Existing Droid',
    modeLabel: 'Modification Draft',
    railLabel: 'Installed Systems',
    actionRailLabel: 'Modification Rail',
    validationLabel: 'Modification Status',
    subtitle: 'Garage modification mode for an existing owned droid.',
    description: 'Used by Garage when modifying an already-created droid.',
  },
  storeQuote: {
    id: 'storeQuote',
    modeClass: 'store-quote',
    hostKind: 'store',
    hudLabel: 'GARAGE QUOTE MODE',
    hostLabel: 'Store Quote',
    modeLabel: 'Purchase Quote',
    railLabel: 'Quoted Build',
    actionRailLabel: 'Quote Rail',
    validationLabel: 'Quote Status',
    subtitle: 'Garage construction mode for a store-side droid quote.',
    description: 'Used by Store-side droid construction before purchase or GM approval.',
  },
  followerDraft: {
    id: 'followerDraft',
    modeClass: 'follower-draft',
    hostKind: 'follower',
    hudLabel: 'GARAGE FOLLOWER MODE',
    hostLabel: 'Follower Droid',
    modeLabel: 'Follower Draft',
    railLabel: 'Follower Build',
    actionRailLabel: 'Build Rail',
    validationLabel: 'Follower Build Status',
    subtitle: 'Garage construction mode for a follower or minion droid chassis.',
    description: 'Used by follower and minion flows that need the shared droid construction workbench.',
  },
  gmDraft: {
    id: 'gmDraft',
    modeClass: 'gm-draft',
    hostKind: 'gm',
    hudLabel: 'GM GARAGE MODE',
    hostLabel: 'GM Build',
    modeLabel: 'GM Draft',
    railLabel: 'GM Build',
    actionRailLabel: 'Command Rail',
    validationLabel: 'Command Status',
    subtitle: 'Garage construction mode for GM-created droid chassis.',
    description: 'Used by future GM tools that host the same droid construction workbench.',
  },
});


function selectedKeyMatches(selectedKey, uid, category, id, subcategory = null) {
  if (!selectedKey) return false;
  const normalized = String(selectedKey);
  if (normalized === uid) return true;
  return normalized === `${category}:${subcategory || 'base'}:${id}`;
}

export class DroidBuilderViewModelAdapter {
  /**
   * Build a Garage-style view model for the current droid builder state.
   */
  static build({ droidState, readiness = null, suggestedIds = new Set(), confidenceMap = new Map(), contextMode = 'chargenDraft', selectedComponentKey = null } = {}) {
    const normalizedContextMode = this.#normalizeContextMode(contextMode);
    const contextProfile = this.#contextProfileFor(normalizedContextMode);

    if (!droidState) {
      return this.#emptyViewModel(normalizedContextMode);
    }

    const degree = this.#normalizeDegree(droidState.droidDegree);
    const size = this.#normalizeSize(droidState.droidSize);
    const costFactor = getDroidSizeCostFactor(size);
    const degreePackage = getDroidDegreePackage(degree);
    const sizePackage = getDroidSizePackage(size);
    const systems = droidState.droidSystems || {};
    const credits = this.#normalizeCredits(droidState.droidCredits, systems);
    const installedGroups = this.#buildInstalledGroups(systems, selectedComponentKey);
    const installedLookup = this.#buildInstalledLookup(installedGroups);
    const budget = this.#buildBudget(credits);
    const requiredChecklist = this.#buildRequiredChecklist(systems, readiness);
    const availableGroups = this.#buildAvailableGroups({
      droidState,
      degree,
      size,
      costFactor,
      credits,
      installedLookup,
      suggestedIds,
      confidenceMap,
      selectedComponentKey,
    });
    const availableSystemsFlat = availableGroups.flatMap(group => group.items || []);
    const selectedDetail = this.#buildSelectedDetail(availableSystemsFlat, installedGroups, selectedComponentKey);
    const activeGroupId = selectedDetail?.item?.groupId || availableGroups[0]?.id || null;
    for (const group of availableGroups) {
      group.isActive = group.id === activeGroupId;
    }
    const validation = this.#buildValidation(readiness, budget, requiredChecklist);

    return {
      mode: normalizedContextMode,
      modeClass: contextProfile.modeClass,
      contextMode: normalizedContextMode,
      contextProfile,
      title: 'Droid Chassis Builder',
      subtitle: contextProfile.subtitle,
      chassis: {
        degree,
        degreeLabel: degreePackage?.name || this.#titleCase(degree),
        degreeRoles: degreePackage?.typicalRoles || '',
        degreeDescription: degreePackage?.description || '',
        degreeOptions: this.#buildDegreeOptions(degree, droidState),
        degreeLocked: !!droidState.speciesDroidBuilder?.fixedDegree,
        size,
        sizeLabel: this.#titleCase(size),
        sizeOptions: this.#buildSizeOptions(size, droidState),
        sizeLocked: !!droidState.speciesDroidBuilder?.fixedSize,
        multiplier: costFactor,
        multiplierLabel: `x${costFactor}`,
        sizePackage,
        abilityMods: combineDroidAbilityMods(degree, size),
      },
      budget,
      installedGroups,
      installedCount: installedGroups.reduce((sum, group) => sum + (group.items?.length || 0), 0),
      requiredChecklist,
      availableGroups,
      availableSystemsFlat,
      selectedDetail,
      validation,
      warnings: validation.warnings,
      errors: validation.errors,
      reusableHosts: ['chargenDraft', 'buildNew', 'modifyExisting', 'storeQuote', 'followerDraft', 'gmDraft'],
      dataShapeVersion: 2,
    };
  }

  static #emptyViewModel(contextMode) {
    const normalizedContextMode = this.#normalizeContextMode(contextMode);
    const contextProfile = this.#contextProfileFor(normalizedContextMode);
    return {
      mode: normalizedContextMode,
      modeClass: contextProfile.modeClass,
      contextMode: normalizedContextMode,
      contextProfile,
      title: 'Droid Chassis Builder',
      subtitle: 'No droid construction state is available yet.',
      chassis: null,
      budget: this.#buildBudget({ base: 0, spent: 0, remaining: 0 }),
      installedGroups: [],
      installedCount: 0,
      requiredChecklist: [],
      availableGroups: [],
      availableSystemsFlat: [],
      selectedDetail: { isEmpty: true, message: 'Select a droid component to inspect installation details.' },
      validation: {
        isValid: false,
        tone: 'warning',
        summary: 'Droid construction state unavailable.',
        errors: ['Droid construction state unavailable.'],
        warnings: [],
      },
      warnings: [],
      errors: ['Droid construction state unavailable.'],
      reusableHosts: ['chargenDraft', 'buildNew', 'modifyExisting', 'storeQuote', 'followerDraft', 'gmDraft'],
      dataShapeVersion: 2,
    };
  }

  static #normalizeContextMode(contextMode) {
    const normalized = String(contextMode || 'chargenDraft').trim();
    if (DROID_BUILDER_CONTEXT_PROFILES[normalized]) return normalized;
    const lower = normalized.toLowerCase();
    const aliases = {
      chargen: 'chargenDraft',
      charactercreation: 'chargenDraft',
      charactercreationdraft: 'chargenDraft',
      new: 'buildNew',
      newbuild: 'buildNew',
      garage: 'modifyExisting',
      modify: 'modifyExisting',
      store: 'storeQuote',
      quote: 'storeQuote',
      follower: 'followerDraft',
      minion: 'followerDraft',
      gm: 'gmDraft',
      gmdraft: 'gmDraft',
    };
    return aliases[lower] || 'chargenDraft';
  }

  static #contextProfileFor(contextMode) {
    return DROID_BUILDER_CONTEXT_PROFILES[this.#normalizeContextMode(contextMode)]
      || DROID_BUILDER_CONTEXT_PROFILES.chargenDraft;
  }

  static #normalizeDegree(degree) {
    return String(degree || '1st-degree').trim().toLowerCase();
  }

  static #normalizeSize(size) {
    return String(size || 'medium').trim().toLowerCase();
  }

  static #normalizeCredits(credits = {}, systems = {}) {
    const spent = Number(credits.spent ?? systems.totalCost ?? 0) || 0;
    const base = Number(credits.base ?? 0) || 0;
    const remaining = Number(credits.remaining ?? (base - spent)) || 0;
    return {
      ...credits,
      base,
      spent,
      remaining,
      allowOverflow: !!credits.allowOverflow,
    };
  }

  static #buildBudget(credits) {
    const base = Number(credits.base || 0);
    const spent = Number(credits.spent || 0);
    const remaining = Number(credits.remaining ?? (base - spent));
    let tone = 'positive';
    if (remaining < 0) tone = 'negative';
    else if (remaining === 0) tone = 'neutral';

    return {
      base,
      spent,
      remaining,
      allowOverflow: !!credits.allowOverflow,
      maxTotalCost: Number.isFinite(credits.maxTotalCost) ? credits.maxTotalCost : null,
      standardModelBaseCost: Number(credits.standardModelBaseCost || 0),
      tone,
      isOverBudget: remaining < 0,
      isExact: remaining === 0,
      statusLabel: remaining < 0 ? 'Over Budget' : remaining === 0 ? 'Fully Allocated' : 'Within Budget',
      percentSpent: base > 0 ? Math.min(100, Math.max(0, Math.round((spent / base) * 100))) : 0,
    };
  }

  static #buildDegreeOptions(selectedDegree, droidState = {}) {
    const fixedDegree = droidState.speciesDroidBuilder?.fixedDegree
      ? String(droidState.speciesDroidBuilder.fixedDegree).toLowerCase()
      : null;
    const allowedDegrees = new Set((droidState.speciesDroidBuilder?.allowedDegrees || [])
      .map(value => String(value).toLowerCase()));

    return Object.entries(DROID_DEGREE_PACKAGES).map(([id, pkg]) => {
      const disabled = !!fixedDegree ? id !== fixedDegree : allowedDegrees.size > 0 && !allowedDegrees.has(id);
      return {
        id,
        label: pkg.name || this.#titleCase(id),
        description: pkg.description || '',
        roles: pkg.typicalRoles || '',
        isSelected: id === selectedDegree,
        disabled,
      };
    });
  }

  static #buildSizeOptions(selectedSize, droidState = {}) {
    const fixedSize = droidState.speciesDroidBuilder?.fixedSize
      ? String(droidState.speciesDroidBuilder.fixedSize).toLowerCase()
      : null;
    const allowedSizes = new Set((droidState.speciesDroidBuilder?.allowedSizes || [])
      .map(value => String(value).toLowerCase()));

    return Object.entries(DROID_SIZE_PACKAGES).map(([id, pkg]) => {
      const disabled = !!fixedSize ? id !== fixedSize : allowedSizes.size > 0 && !allowedSizes.has(id);
      return {
        id,
        label: this.#titleCase(id),
        multiplier: pkg.costFactor || 1,
        multiplierLabel: `x${pkg.costFactor || 1}`,
        baseSpeed: pkg.baseSpeed ?? null,
        defaultLocomotion: pkg.defaultLocomotion || '',
        isSelected: id === selectedSize,
        disabled,
      };
    });
  }

  static #buildInstalledGroups(systems = {}, selectedComponentKey = null) {
    return [
      this.#buildInstalledGroup('locomotion', 'Locomotion', true, systems.locomotion ? [systems.locomotion] : [], selectedComponentKey),
      this.#buildInstalledGroup('processor', 'Processor', true, systems.processor ? [systems.processor] : [], selectedComponentKey),
      this.#buildInstalledGroup('appendage', 'Appendages', true, systems.appendages || [], selectedComponentKey),
      this.#buildInstalledGroup('accessory', 'Accessories', false, systems.accessories || [], selectedComponentKey),
      this.#buildInstalledGroup('locomotionEnhancement', 'Locomotion Enhancements', false, systems.locomotionEnhancements || [], selectedComponentKey),
      this.#buildInstalledGroup('appendageEnhancement', 'Appendage Enhancements', false, systems.appendageEnhancements || [], selectedComponentKey),
    ].map(group => ({
      ...group,
      isComplete: group.required ? group.items.length > 0 : true,
      isEmpty: group.items.length === 0,
    }));
  }

  static #buildInstalledGroup(id, label, required, items, selectedComponentKey = null) {
    return {
      id,
      actionCategory: this.#actionCategoryForGroup(id),
      label,
      required,
      items: (items || []).filter(Boolean).map((item, index) => this.#normalizeInstalledItem(item, id, index, selectedComponentKey)),
    };
  }

  static #normalizeInstalledItem(item, groupId, index, selectedComponentKey = null) {
    const actionCategory = this.#actionCategoryForGroup(groupId);
    const subcategory = item.category || item.subcategory || null;
    const detailKey = `${actionCategory}:${subcategory || 'base'}:${item.id || ''}`;

    return {
      id: item.id || `${groupId}-${index}`,
      uid: `${groupId}:${item.id || index}:${index}`,
      name: item.name || this.#titleCase(item.id || groupId),
      groupId,
      category: item.category || item.subcategory || this.#actionCategoryForGroup(groupId),
      subcategory,
      type: CATEGORY_LABELS[groupId] || CATEGORY_LABELS[actionCategory] || this.#titleCase(groupId),
      description: item.description || '',
      baseCost: this.#formatCredits(item.baseCost ?? item.cost ?? 0),
      adjustedCost: Number(item.cost || 0),
      cost: Number(item.cost || 0),
      weight: Number(item.weight || 0),
      speed: item.speed ?? null,
      sizeMultiplier: item.sizeMultiplier || item.costFactor || 1,
      budgetImpact: 0,
      budgetImpactLabel: '0 cr',
      isDefault: !!item.isDefault,
      isGranted: !!item.isGranted,
      isRequired: !!item.isRequired || (groupId === 'processor' && item.id === 'heuristic'),
      isLocked: !!item.isLocked || (groupId === 'processor' && item.id === 'heuristic'),
      isInstalled: true,
      isSelected: selectedKeyMatches(selectedComponentKey, detailKey, actionCategory, item.id || '', subcategory),
      isSuggested: false,
      canInstall: false,
      canRemove: !(!!item.isLocked || (groupId === 'processor' && item.id === 'heuristic')),
      disabled: false,
      disabledReasons: [],
      compatibility: { isCompatible: true, reasons: [] },
      detailKey,
      installAction: null,
      removeAction: {
        action: 'remove-system',
        category: this.#actionCategoryForGroup(groupId),
        id: item.id || '',
        subcategory,
      },
    };
  }

  static #buildInstalledLookup(installedGroups) {
    const lookup = new Map();
    for (const group of installedGroups || []) {
      for (const item of group.items || []) {
        const key = this.#lookupKey(group.actionCategory, item.id, item.subcategory);
        lookup.set(key, item);
      }
    }
    return lookup;
  }

  static #buildRequiredChecklist(systems = {}, readiness = null) {
    const issueText = (readiness?.issues || []).join(' | ').toLowerCase();
    const checklist = [
      {
        id: 'locomotion',
        label: 'Locomotion selected',
        complete: !!systems.locomotion,
        message: systems.locomotion ? systems.locomotion.name : 'Choose a locomotion platform.',
      },
      {
        id: 'processor',
        label: 'Processor installed',
        complete: !!systems.processor,
        message: systems.processor ? systems.processor.name : 'Install a processor.',
      },
      {
        id: 'appendage',
        label: 'At least one appendage',
        complete: (systems.appendages || []).length > 0,
        message: `${(systems.appendages || []).length} installed`,
      },
      {
        id: 'budget',
        label: 'Within construction budget',
        complete: !issueText.includes('over budget'),
        message: issueText.includes('over budget') ? 'Remove or swap systems to continue.' : 'Budget check passed.',
      },
    ];

    return checklist.map(item => ({
      ...item,
      tone: item.complete ? 'positive' : 'negative',
    }));
  }

  static #buildAvailableGroups({ droidState, degree, size, costFactor, credits, installedLookup, suggestedIds, confidenceMap, selectedComponentKey = null }) {
    const groups = [
      this.#buildAvailableGroup('locomotion', 'Locomotion', DROID_SYSTEMS.locomotion || [], {
        droidState,
        degree,
        size,
        costFactor,
        credits,
        installedLookup,
        suggestedIds,
        confidenceMap,
      }),
      this.#buildAvailableGroup('processor', 'Processor', DROID_SYSTEMS.processors || [], {
        droidState,
        degree,
        size,
        costFactor,
        credits,
        installedLookup,
        suggestedIds,
        confidenceMap,
      }),
      this.#buildAvailableGroup('appendage', 'Appendages', DROID_SYSTEMS.appendages || [], {
        droidState,
        degree,
        size,
        costFactor,
        credits,
        installedLookup,
        suggestedIds,
        confidenceMap,
      }),
      this.#buildAccessoryAvailableGroup({ droidState, degree, size, costFactor, credits, installedLookup, suggestedIds, confidenceMap }),
      this.#buildAvailableGroup('locomotionEnhancement', 'Locomotion Enhancements', DROID_SYSTEMS.locomotionEnhancements || [], {
        droidState,
        degree,
        size,
        costFactor,
        credits,
        installedLookup,
        suggestedIds,
        confidenceMap,
      }),
      this.#buildAvailableGroup('appendageEnhancement', 'Appendage Enhancements', DROID_SYSTEMS.appendageEnhancements || [], {
        droidState,
        degree,
        size,
        costFactor,
        credits,
        installedLookup,
        suggestedIds,
        confidenceMap,
      }),
    ];

    return groups.filter(group => group.items.length > 0 || REQUIRED_GROUPS.has(group.actionCategory));
  }

  static #buildAvailableGroup(id, label, rawItems, context) {
    const actionCategory = this.#actionCategoryForGroup(id);
    const items = (rawItems || []).map(item => this.#normalizeAvailableItem(item, {
      ...context,
      groupId: id,
      actionCategory,
      subcategory: null,
    }));

    return {
      id,
      actionCategory,
      label,
      description: CATEGORY_DESCRIPTIONS[id] || CATEGORY_DESCRIPTIONS[actionCategory] || '',
      count: items.length,
      enabledCount: items.filter(item => item.canInstall).length,
      disabledCount: items.filter(item => !item.canInstall).length,
      items,
    };
  }

  static #buildAccessoryAvailableGroup(context) {
    const items = [];
    const subgroups = [];

    for (const [subcategory, systems] of Object.entries(DROID_SYSTEMS.accessories || {})) {
      const subgroupItems = (systems || []).map(item => this.#normalizeAvailableItem(item, {
        ...context,
        groupId: 'accessory',
        actionCategory: 'accessory',
        subcategory,
      }));
      if (subgroupItems.length) {
        subgroups.push({
          id: subcategory,
          label: this.#titleCase(subcategory),
          count: subgroupItems.length,
          enabledCount: subgroupItems.filter(item => item.canInstall).length,
          disabledCount: subgroupItems.filter(item => !item.canInstall).length,
          items: subgroupItems,
        });
        items.push(...subgroupItems);
      }
    }

    return {
      id: 'accessory',
      actionCategory: 'accessory',
      label: CATEGORY_LABELS.accessory,
      description: CATEGORY_DESCRIPTIONS.accessory,
      count: items.length,
      enabledCount: items.filter(item => item.canInstall).length,
      disabledCount: items.filter(item => !item.canInstall).length,
      subgroups,
      items,
    };
  }

  static #normalizeAvailableItem(item, context) {
    const cost = this.#calculateAdjustedCost(item, context);
    const weight = this.#calculateWeight(item, context);
    const speed = this.#calculateSpeed(item, context);
    const lookupKey = this.#lookupKey(context.actionCategory, item.id, context.subcategory);
    const installedItem = context.installedLookup.get(lookupKey) || null;
    const isInstalled = !!installedItem || this.#isSingletonSelected(item, context);
    const budgetImpact = this.#calculateBudgetImpact(cost, context, installedItem);
    const reasons = this.#compatibilityReasons(item, context, {
      isInstalled,
      installedItem,
      cost,
      budgetImpact,
    });
    const canInstall = reasons.length === 0 || (isInstalled && reasons.every(reason => reason.code === 'duplicate'));
    const suggested = this.#isSuggested(item.id, context.suggestedIds);
    const confidence = this.#confidenceFor(item.id, context.confidenceMap);

    const uid = `${context.actionCategory}:${context.subcategory || 'base'}:${item.id}`;
    const isSelected = selectedKeyMatches(context.selectedComponentKey, uid, context.actionCategory, item.id, context.subcategory);

    return {
      id: item.id,
      uid,
      name: item.name || this.#titleCase(item.id),
      description: item.description || '',
      category: context.actionCategory,
      groupId: context.groupId,
      subcategory: context.subcategory,
      type: item.type || item.category || context.subcategory || context.actionCategory,
      role: item.role || null,
      availability: item.availability || '-',
      features: item.features || item.effects || [],
      restrictions: item.restrictions || [],
      baseCost: this.#baseCostLabel(item),
      adjustedCost: cost,
      cost,
      weight,
      speed,
      sizeMultiplier: context.costFactor,
      budgetImpact,
      budgetImpactLabel: this.#formatCredits(budgetImpact),
      isInstalled,
      isSelected,
      isSuggested: suggested,
      badgeLabel: suggested ? 'Recommended' : null,
      confidenceLevel: confidence?.confidenceLevel || null,
      canInstall: !isInstalled && canInstall,
      canRemove: !!installedItem && !installedItem.isLocked,
      disabled: !canInstall && !isInstalled,
      disabledReasons: reasons.map(reason => reason.message),
      compatibility: {
        isCompatible: reasons.length === 0,
        reasons,
      },
      installAction: {
        action: 'install-system',
        fallbackAction: 'purchase-system',
        category: context.actionCategory,
        id: item.id,
        subcategory: context.subcategory,
      },
      removeAction: {
        action: 'remove-system',
        category: context.actionCategory,
        id: item.id,
        subcategory: context.subcategory,
      },
      raw: item,
    };
  }

  static #compatibilityReasons(item, context, { isInstalled, installedItem, budgetImpact }) {
    const reasons = [];

    if (!this.#allowedBySpeciesConstraints(item, context)) {
      reasons.push({ code: 'species-constraint', message: 'Not allowed by this chassis profile.' });
    }

    if (!this.#degreeAllows(item, context.degree)) {
      reasons.push({ code: 'wrong-degree', message: `Not compatible with ${this.#titleCase(context.degree)} droids.` });
    }

    if (!this.#sizeAllows(item, context.size)) {
      reasons.push({ code: 'wrong-size', message: `Not compatible with ${this.#titleCase(context.size)} chassis size.` });
    }

    if (this.#missingPrerequisites(item, context).length) {
      for (const message of this.#missingPrerequisites(item, context)) {
        reasons.push({ code: 'prerequisite-missing', message });
      }
    }

    if (this.#hasConflict(item, context)) {
      reasons.push({ code: 'conflict', message: 'Conflicts with an installed system.' });
    }

    if (this.#isDuplicateBlocked(item, context, installedItem)) {
      reasons.push({ code: 'duplicate', message: 'Already installed.' });
    }

    if (!isInstalled && budgetImpact > context.credits.remaining && !context.credits.allowOverflow) {
      reasons.push({ code: 'over-budget', message: 'Insufficient construction credits.' });
    }

    return reasons;
  }

  static #allowedBySpeciesConstraints(item, context) {
    const constraints = context.droidState?.speciesDroidBuilder || null;
    if (!constraints) return true;

    const allowedCategories = new Set(constraints.allowedCategories || []);
    if (allowedCategories.size && !allowedCategories.has(context.actionCategory) && !allowedCategories.has(context.groupId) && !allowedCategories.has(context.subcategory)) {
      return false;
    }

    if (context.actionCategory === 'accessory') {
      const allowedSubcategories = new Set(constraints.allowedAccessorySubcategories || []);
      const allowedIds = new Set(constraints.allowedAccessoryIds || []);
      if (allowedSubcategories.size && !allowedSubcategories.has(context.subcategory)) return false;
      if (allowedIds.size && !allowedIds.has(item.id)) return false;
    }

    return true;
  }

  static #degreeAllows(item, degree) {
    const allowed = item.allowedDegrees || item.degreeRestriction || item.degreeRestrictions || item.requiresDegree || item.requiredDegree;
    if (!allowed) return true;
    const allowedList = Array.isArray(allowed) ? allowed : [allowed];
    return allowedList.map(value => String(value).toLowerCase()).includes(String(degree).toLowerCase());
  }

  static #sizeAllows(item, size) {
    if (item.sizeRestriction && !this.#sizeAtLeast(size, item.sizeRestriction)) return false;
    if (item.sizeMinimum && !this.#sizeAtLeast(size, item.sizeMinimum)) return false;
    if (item.minSize && !this.#sizeAtLeast(size, item.minSize)) return false;
    if (item.maxSize && !this.#sizeAtMost(size, item.maxSize)) return false;
    const allowed = item.allowedSizes || item.sizeAllowed;
    if (allowed) {
      const allowedList = Array.isArray(allowed) ? allowed : [allowed];
      return allowedList.map(value => String(value).toLowerCase()).includes(String(size).toLowerCase());
    }
    return true;
  }

  static #sizeAtLeast(size, minimum) {
    const sizeIndex = SIZE_ORDER.indexOf(String(size).toLowerCase());
    const minimumIndex = SIZE_ORDER.indexOf(String(minimum).toLowerCase());
    if (sizeIndex < 0 || minimumIndex < 0) return true;
    return sizeIndex >= minimumIndex;
  }

  static #sizeAtMost(size, maximum) {
    const sizeIndex = SIZE_ORDER.indexOf(String(size).toLowerCase());
    const maximumIndex = SIZE_ORDER.indexOf(String(maximum).toLowerCase());
    if (sizeIndex < 0 || maximumIndex < 0) return true;
    return sizeIndex <= maximumIndex;
  }

  static #missingPrerequisites(item, context) {
    const messages = [];
    const systems = context.droidState?.droidSystems || {};
    const locomotionId = systems.locomotion?.id || null;
    const appendageIds = new Set((systems.appendages || []).map(appendage => appendage.id));
    const accessoryIds = new Set((systems.accessories || []).map(accessory => accessory.id));

    const requiredLocomotion = item.requiredLocomotion || item.requiresLocomotion || item.requiresLocomtion;
    if (requiredLocomotion && requiredLocomotion !== 'any') {
      const allowed = Array.isArray(requiredLocomotion) ? requiredLocomotion : [requiredLocomotion];
      if (!locomotionId || !allowed.includes(locomotionId)) {
        messages.push(`Requires ${allowed.map(value => this.#titleCase(value)).join(' or ')} locomotion.`);
      }
    }

    const requiredAppendage = item.requiresAppendage || item.requiredAppendage;
    if (requiredAppendage) {
      const allowed = Array.isArray(requiredAppendage) ? requiredAppendage : [requiredAppendage];
      if (!allowed.some(id => appendageIds.has(id))) {
        messages.push(`Requires ${allowed.map(value => this.#titleCase(value)).join(' or ')} appendage.`);
      }
    }

    const requiresAccessory = item.requiresAccessory || item.requiredAccessory;
    if (requiresAccessory) {
      const allowed = Array.isArray(requiresAccessory) ? requiresAccessory : [requiresAccessory];
      if (!allowed.some(id => accessoryIds.has(id))) {
        messages.push(`Requires ${allowed.map(value => this.#titleCase(value)).join(' or ')} accessory.`);
      }
    }

    if (item.id === 'shield-expansion-module' && !Array.from(accessoryIds).some(id => id.includes('shield-generator'))) {
      messages.push('Requires an installed shield generator.');
    }

    return messages;
  }

  static #hasConflict(item, context) {
    const conflicts = item.conflictsWith || item.conflicts || [];
    if (!conflicts.length) return false;
    const conflictSet = new Set(Array.isArray(conflicts) ? conflicts : [conflicts]);
    for (const group of this.#buildInstalledGroups(context.droidState?.droidSystems || {})) {
      if ((group.items || []).some(installed => conflictSet.has(installed.id))) return true;
    }
    return false;
  }

  static #isDuplicateBlocked(item, context, installedItem) {
    if (!installedItem) return false;
    if (context.actionCategory === 'appendage') return false;
    return true;
  }

  static #isSingletonSelected(item, context) {
    const systems = context.droidState?.droidSystems || {};
    if (context.actionCategory === 'locomotion') return systems.locomotion?.id === item.id;
    if (context.actionCategory === 'processor') return systems.processor?.id === item.id;
    return false;
  }

  static #calculateBudgetImpact(cost, context, installedItem) {
    if (installedItem) return 0;
    if (context.actionCategory === 'locomotion') {
      return Math.max(0, Number(cost || 0) - Number(context.droidState?.droidSystems?.locomotion?.cost || 0));
    }
    if (context.actionCategory === 'processor') {
      return Math.max(0, Number(cost || 0) - Number(context.droidState?.droidSystems?.processor?.cost || 0));
    }
    return Number(cost || 0);
  }

  static #calculateAdjustedCost(item, context) {
    const costFactor = context.costFactor || 1;
    const size = context.size || 'medium';
    const speed = this.#calculateSpeed(item, context);

    if (context.actionCategory === 'processor' && item.id === 'heuristic') {
      return 0;
    }

    if (context.actionCategory === 'locomotion' && typeof item.costFormula === 'function') {
      return this.#safeNumber(item.costFormula(speed, costFactor));
    }

    if (context.actionCategory === 'locomotionEnhancement' && Number(item.costMultiplier || 0) > 0) {
      const baseLocomotionCost = Number(context.droidState?.droidSystems?.locomotion?.cost || 0);
      if (baseLocomotionCost > 0) return this.#safeNumber(baseLocomotionCost * Number(item.costMultiplier));
    }

    if (typeof item.costFormula === 'function') {
      return this.#safeNumber(item.costFormula(speed, costFactor));
    }

    if (typeof item.cost === 'function') {
      return this.#safeNumber(item.cost(costFactor));
    }

    if (typeof item.cost === 'number') {
      return this.#safeNumber(item.cost);
    }

    if (item.rangeOptions?.length) {
      return this.#safeNumber(item.rangeOptions[0]?.cost || 0);
    }

    return 0;
  }

  static #calculateWeight(item, context) {
    const costFactor = context.costFactor || 1;
    if (typeof item.weightFormula === 'function') return this.#safeNumber(item.weightFormula(costFactor));
    if (typeof item.weight === 'function') return this.#safeNumber(item.weight(costFactor));
    if (typeof item.weight === 'number') return this.#safeNumber(item.weight);
    if (item.rangeOptions?.length) return this.#safeNumber(item.rangeOptions[0]?.weight || 0);
    return 0;
  }

  static #calculateSpeed(item, context) {
    const size = context.size || 'medium';
    if (item.speeds) return Number(item.speeds[size] ?? item.speeds.medium ?? 0) || 0;
    if (item.baseSpeed) return Number(item.baseSpeed[size] ?? item.baseSpeed.medium ?? 0) || 0;
    return Number(context.droidState?.droidSystems?.locomotion?.speed || 0) || 0;
  }

  static #baseCostLabel(item) {
    if (typeof item.cost === 'number') return this.#formatCredits(item.cost);
    if (typeof item.cost === 'function' || typeof item.costFormula === 'function') return 'Formula';
    if (item.rangeOptions?.length) return `${this.#formatCredits(item.rangeOptions[0]?.cost || 0)}+`;
    return '0 cr';
  }

  static #buildSelectedDetail(availableSystemsFlat, installedGroups, selectedComponentKey = null) {
    if (!selectedComponentKey) {
      return {
        isEmpty: true,
        message: 'Select a droid component in the middle rail to inspect cost, compatibility, and install/remove controls.',
      };
    }

    const installedSystemsFlat = (installedGroups || []).flatMap(group => group.items || []);
    const installedItem = installedSystemsFlat.find(item => item.detailKey === selectedComponentKey || item.uid === selectedComponentKey) || null;
    const item = availableSystemsFlat.find(item => item.uid === selectedComponentKey) || installedItem || null;

    if (!item) {
      return {
        isEmpty: true,
        message: 'The selected component is no longer available for the current chassis. Select another component to continue.',
      };
    }

    return {
      isEmpty: false,
      item,
      source: item.isInstalled ? 'installed' : 'available',
      selectedComponentKey: item.uid,
      installedSummary: installedGroups.map(group => ({ id: group.id, label: group.label, count: group.items.length })),
    };
  }

  static #buildValidation(readiness, budget, requiredChecklist) {
    const errors = [...(readiness?.issues || [])];
    const warnings = [];

    for (const requirement of requiredChecklist || []) {
      if (!requirement.complete) {
        const message = requirement.message && requirement.message !== '0 installed'
          ? requirement.message
          : `${requirement.label} is required.`;
        if (!errors.includes(message)) errors.push(message);
      }
    }

    if (budget.isExact) warnings.push('Construction budget fully allocated.');

    return {
      isValid: !!readiness?.isValid && errors.length === 0,
      isDeferred: !!readiness?.isDeferred,
      tone: errors.length ? 'negative' : budget.isExact ? 'neutral' : 'positive',
      summary: readiness?.summary || (errors.length ? `${errors.length} requirement(s) not met.` : 'Droid build is ready.'),
      errors,
      warnings,
    };
  }

  static #isSuggested(id, suggestedIds) {
    if (!suggestedIds) return false;
    if (suggestedIds instanceof Set) return suggestedIds.has(id);
    if (Array.isArray(suggestedIds)) return suggestedIds.includes(id);
    return false;
  }

  static #confidenceFor(id, confidenceMap) {
    if (!confidenceMap) return null;
    if (confidenceMap instanceof Map) return confidenceMap.get(id) || null;
    return confidenceMap[id] || null;
  }

  static #lookupKey(category, id, subcategory = null) {
    return `${category}:${subcategory || 'base'}:${id}`;
  }

  static #actionCategoryForGroup(groupId) {
    if (groupId === 'locomotionEnhancement' || groupId === 'appendageEnhancement') return 'enhancement';
    if (groupId === 'processor') return 'processor';
    if (groupId === 'appendage') return 'appendage';
    if (groupId === 'accessory') return 'accessory';
    return 'locomotion';
  }

  static #safeNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.ceil(number));
  }

  static #formatCredits(value) {
    return `${Number(value || 0).toLocaleString()} cr`;
  }

  static #titleCase(value) {
    return String(value || '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
