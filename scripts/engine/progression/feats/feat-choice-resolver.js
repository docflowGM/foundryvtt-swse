/**
 * FeatChoiceResolver
 *
 * Central backend resolver for feats that require player choices.
 *
 * Phase 2 scope:
 * - distinguish fixed, prerequisite-derived, and grant-pool choices
 * - expose missing-choice/backfill records for future dialogs
 * - derive consumer choices from provider choices (for example Weapon Focus from Weapon Proficiency)
 * - avoid UI implementation and avoid writing choices without explicit caller input
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatDiagnostics } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-diagnostics.js";

const REGISTRY_PATH = 'systems/foundryvtt-swse/data/feat-choice-options.json';
const DEFAULT_CHOICE_ROOT = 'system.selectedChoice';

function stableKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function nameKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstScalar(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const nested = firstScalar(
        value.key, value.slug, value.system?.key, value.name, value.label, value.displayName,
        value.value, value.id, value._id, value.internalId, value.skill, value.skillKey, value.skillId
      );
      if (nested) return nested;
      continue;
    }
    const text = String(value).trim();
    if (text && text !== '[object Object]') return text;
  }
  return '';
}

function normalizeSkillChoiceKey(value) {
  return stableKey(firstScalar(value) || value);
}

const SKILL_LABELS = Object.freeze({
  acrobatics: 'Acrobatics',
  climb: 'Climb',
  deception: 'Deception',
  endurance: 'Endurance',
  gather_information: 'Gather Information',
  gatherinformation: 'Gather Information',
  initiative: 'Initiative',
  jump: 'Jump',
  knowledge_bureaucracy: 'Knowledge (Bureaucracy)',
  knowledge_galactic_lore: 'Knowledge (Galactic Lore)',
  knowledge_life_sciences: 'Knowledge (Life Sciences)',
  knowledge_physical_sciences: 'Knowledge (Physical Sciences)',
  knowledge_social_sciences: 'Knowledge (Social Sciences)',
  knowledge_tactics: 'Knowledge (Tactics)',
  knowledge_technology: 'Knowledge (Technology)',
  mechanics: 'Mechanics',
  perception: 'Perception',
  persuasion: 'Persuasion',
  pilot: 'Pilot',
  ride: 'Ride',
  stealth: 'Stealth',
  survival: 'Survival',
  swim: 'Swim',
  treat_injury: 'Treat Injury',
  treatinjury: 'Treat Injury',
  use_computer: 'Use Computer',
  usecomputer: 'Use Computer',
  use_the_force: 'Use the Force',
  usetheforce: 'Use the Force'
});

function labelForSkill(key, fallback = '') {
  const normalized = normalizeSkillChoiceKey(key || fallback);
  return SKILL_LABELS[normalized] || firstScalar(fallback, key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function isTrainedSkillRecord(record) {
  if (!record) return false;
  if (record === true) return true;
  if (typeof record !== 'object') return false;
  return Boolean(
    record.trained === true ||
    record.isTrained === true ||
    record.value?.trained === true ||
    record.system?.trained === true ||
    record.system?.value?.trained === true
  );
}

function getPropertySafe(source, path) {
  if (!source || !path) return undefined;
  if (globalThis.foundry?.utils?.getProperty) {
    return foundry.utils.getProperty(source, path);
  }
  return String(path).split('.').reduce((current, part) => current?.[part], source);
}

function setPropertySafe(target, path, value) {
  if (!target || !path) return target;
  if (globalThis.foundry?.utils?.setProperty) {
    foundry.utils.setProperty(target, path, value);
    return target;
  }
  const parts = String(path).split('.');
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
  return target;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set || value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value.contents)) return value.contents;
  if (typeof value.values === 'function' && typeof value !== 'string') {
    try {
      const entries = Array.from(value.values());
      if (entries.length || value.size === 0) return entries;
    } catch (_err) {
      // Fall through to scalar wrapper.
    }
  }
  return [value];
}

function uniqueById(options) {
  const seen = new Set();
  const results = [];
  for (const option of options || []) {
    const id = String(option?.id || option?.value || option?.label || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    results.push(option);
  }
  return results;
}

function normalizeChoiceEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { id: stableKey(entry), label: entry, value: stableKey(entry) };
  }
  const label = entry.label || entry.name || entry.weapon || entry.group || entry.id || entry.value;
  const id = entry.id || entry.value || stableKey(label);
  return {
    ...entry,
    id: String(id),
    label: String(label || id),
    value: entry.value || String(id)
  };
}

function findWeaponGroup(registry, value) {
  const key = stableKey(value);
  if (!key) return null;
  return (registry?.weaponGroups || []).find((entry) => {
    const ids = [entry?.id, entry?.proficiencyValue, entry?.label, entry?.name].map(stableKey);
    return ids.includes(key);
  }) || null;
}

function weaponGroupCanonicalValue(registry, value) {
  const group = findWeaponGroup(registry, value);
  return group?.id || group?.proficiencyValue || stableKey(value);
}

function isPlaceholderWeaponChoice(value) {
  const key = stableKey(firstScalar(value));
  return [
    'chosen_weapon',
    'selected_weapon',
    'selected_weapon_group',
    'chosen_weapon_group',
    'particular_weapon',
    'one_weapon'
  ].includes(key);
}

export class FeatChoiceResolver {
  static _registry = null;
  static _registryPromise = null;

  static async loadRegistry({ force = false } = {}) {
    if (!force && this._registry) return this._registry;
    if (!force && this._registryPromise) return this._registryPromise;

    this._registryPromise = fetch(REGISTRY_PATH)
      .then((response) => {
        if (!response?.ok) throw new Error(`Unable to load ${REGISTRY_PATH}: ${response?.status}`);
        return response.json();
      })
      .then((data) => {
        this._registry = data || {};
        return this._registry;
      })
      .catch((err) => {
        SWSELogger.warn?.('[FeatChoiceResolver] Failed to load choice registry', err);
        this._registry = { schemaVersion: 0, choiceKinds: {} };
        return this._registry;
      })
      .finally(() => {
        this._registryPromise = null;
      });

    return this._registryPromise;
  }

  static getChoiceMeta(itemOrFeat) {
    const system = itemOrFeat?.system || itemOrFeat?.data?.system || {};
    const meta = system.choiceMeta || itemOrFeat?.choiceMeta || null;
    if (!meta || typeof meta !== 'object') return null;
    return meta;
  }

  static requiresChoice(itemOrFeat) {
    const meta = this.getChoiceMeta(itemOrFeat);
    return Boolean(meta?.required || meta?.resolution === 'immediate' || meta?.resolution === 'grant_entitlement');
  }

  static getChoiceKind(itemOrFeat) {
    const meta = this.getChoiceMeta(itemOrFeat);
    return meta?.choiceKind || null;
  }

  static inferChoiceSource(itemOrFeat) {
    const meta = this.getChoiceMeta(itemOrFeat);
    if (!meta) return null;
    if (meta.choiceSource) return meta.choiceSource;
    if (meta.resolution === 'grant_entitlement') return 'grantPool';
    if (meta.fixedOptions || meta.options) return 'fixed';

    const kind = meta.choiceKind;
    if ([
      'weapon_focus',
      'greater_weapon_focus',
      'weapon_specialization',
      'greater_weapon_specialization',
      'force_power_focus',
      'double_attack_weapon',
      'triple_attack_weapon',
      'double_attack_followup_weapon',
      'return_fire_weapon',
      'melee_weapon_or_group'
    ].includes(kind)) {
      return 'prerequisiteDerived';
    }
    if ([
      'force_power_pick',
      'starship_maneuver_pick',
      'language_pick'
    ].includes(kind)) {
      return 'grantPool';
    }
    if (kind === 'specific_weapon') return 'actorInventory';
    if (kind === 'talent_choice' || kind === 'once_per_encounter_ability_choice') return 'actorState';
    return 'fixed';
  }

  static getActorFeatItems(actor) {
    return asArray(actor?.items).filter((item) => item?.type === 'feat');
  }

  static getAvailableFeatItems(actor, pending = {}) {
    const results = [...this.getActorFeatItems(actor)];
    const pushPending = (entry, sourceType = 'pending') => {
      if (!entry) return;
      if (typeof entry === 'string') {
        results.push({ name: entry, type: 'feat', system: { sourceType } });
        return;
      }
      results.push({
        ...entry,
        type: entry.type || 'feat',
        system: { ...(entry.system || {}), sourceType: entry.system?.sourceType || sourceType }
      });
    };

    for (const entry of asArray(pending?.selectedFeats)) pushPending(entry, 'pending');
    for (const entry of asArray(pending?.grantedFeats)) pushPending(entry, entry?.sourceType || entry?.system?.sourceType || 'class');
    for (const entry of asArray(pending?.grantedProficiencies)) pushPending(entry, entry?.sourceType || entry?.system?.sourceType || 'class-proficiency');
    return results.filter((item) => item?.type === 'feat');
  }

  static getActorTalentItems(actor) {
    return asArray(actor?.items).filter((item) => item?.type === 'talent');
  }

  static getActorChoiceState(actor) {
    const flags = actor?.flags?.swse?.choices || {};
    const systemChoices = actor?.system?.choices || actor?.system?.selectedChoices || {};
    return { ...systemChoices, ...flags };
  }

  static isClassGrantedItem(itemOrFeat) {
    const system = itemOrFeat?.system || itemOrFeat?.data?.system || {};
    const sourceType = String(system.sourceType || system.grantSourceType || system.source?.type || itemOrFeat?.sourceType || '').toLowerCase();
    const source = String(system.source || itemOrFeat?.source || '').toLowerCase();
    return Boolean(
      system.locked === true ||
      system.choiceEditable === false ||
      sourceType === 'class' ||
      source.includes('class') ||
      system.grantedByClass === true
    );
  }

  static getStoredChoice(actor, itemOrFeat) {
    const meta = this.getChoiceMeta(itemOrFeat);
    if (!meta) return undefined;

    const itemChoice = itemOrFeat?.system?.selectedChoice || itemOrFeat?.system?.selectedChoices;
    if (itemChoice !== undefined) return itemChoice;

    const explicitPath = meta.storagePath;
    if (explicitPath && !String(explicitPath).startsWith('system.')) {
      const value = getPropertySafe(actor, explicitPath);
      if (value !== undefined) return value;
    }

    const state = this.getActorChoiceState(actor);
    const candidates = [
      meta.choiceKey,
      meta.choiceKind,
      stableKey(meta.choiceKind),
      stableKey(itemOrFeat?.name),
      nameKey(itemOrFeat?.name)
    ].filter(Boolean);

    for (const key of candidates) {
      if (state[key] !== undefined) return state[key];
    }

    return undefined;
  }

  static hasStoredChoice(actor, itemOrFeat) {
    const value = this.getStoredChoice(actor, itemOrFeat);
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  static async resolveOptions(actor, itemOrFeat, context = {}) {
    const registry = await this.loadRegistry();
    const meta = this.getChoiceMeta(itemOrFeat);
    if (!meta) return [];

    const source = this.inferChoiceSource(itemOrFeat);
    const kind = meta.choiceKind;
    let options = [];

    if (source === 'fixed') {
      options = this._resolveFixedOptions(actor, registry, meta, kind, itemOrFeat, context);
    } else if (source === 'prerequisiteDerived') {
      options = this._resolvePrerequisiteDerivedOptions(actor, registry, meta, kind, context);
    } else if (source === 'grantPool') {
      options = this._resolveGrantPoolOptions(actor, registry, meta, kind, context);
    } else if (source === 'actorInventory') {
      options = this.getOwnedWeaponChoices(actor, context?.pending || context);
    } else if (source === 'actorState') {
      options = this._resolveActorStateOptions(actor, registry, meta, kind, context);
    }

    FeatDiagnostics.traceChoiceOptionResolution({
      actor,
      feat: itemOrFeat,
      choiceMeta: meta,
      choiceSource: source,
      options,
      context,
    });

    return options;
  }

  static _resolveFixedOptions(actor, registry, meta, kind, itemOrFeat = null, context = {}) {
    const fromMeta = meta.fixedOptions || meta.options;
    if (Array.isArray(fromMeta)) return uniqueById(fromMeta.map(normalizeChoiceEntry).filter(Boolean));

    if (kind === 'weapon_proficiency') {
      const owned = new Set(this.getWeaponProficiencyChoices(actor, registry, context?.pending || context).map(entry => this.getSelectedChoiceKey(entry)));
      return uniqueById((registry.weaponGroups || []).map(normalizeChoiceEntry).filter(Boolean))
        .filter(option => !owned.has(this.getSelectedChoiceKey(option)));
    }

    if (kind === 'tech_category') {
      return this._resolveTechCategoryOptions(actor, registry, meta, context);
    }

    if (kind === 'skill_focus') {
      return this._resolveSkillChoiceOptions(actor, context, { trainedOnly: true });
    }

    if (kind === 'skill_training') {
      return this._resolveSkillChoiceOptions(actor, context, { excludeTrained: true });
    }

    if (kind === 'droid_untrained_skill') {
      const options = this._resolveSkillChoiceOptions(actor, context, { excludeTrained: true });
      return options.filter(option => !['use_the_force', 'usetheforce', 'useTheForce'].includes(String(option?.id || option?.value || '').trim()));
    }

    if (kind === 'trained_skill') {
      return this._resolveSkillChoiceOptions(actor, context, { trainedOnly: true });
    }

    const def = registry.choiceKinds?.[kind];
    const options = def?.options || def?.fixedOptions || [];
    return uniqueById(options.map(normalizeChoiceEntry).filter(Boolean));
  }

  static _resolveTechCategoryOptions(actor, registry, meta = {}, context = {}) {
    const def = registry.choiceKinds?.tech_category || {};
    const allOptions = uniqueById((def.options || meta.options || meta.fixedOptions || [])
      .map(normalizeChoiceEntry)
      .filter(Boolean));
    const pending = context?.pending || context || {};
    const currentItemId = meta?.itemId || context?.itemId || null;
    const selectedKeys = new Set();

    const addChoice = (choice) => {
      const key = this.getSelectedChoiceKey(choice);
      if (key) selectedKeys.add(key);
    };

    const inspectFeat = (item) => {
      if (!item) return;
      const name = stableKey(item.name || item.system?.name || item.label || '');
      if (name !== 'superior_tech') return;
      const id = item.id || item._id || item.itemId || null;
      if (currentItemId && id && id === currentItemId) return;
      const choice = item.system?.selectedChoice
        ?? item.system?.selectedChoices
        ?? item.selectedChoice
        ?? item.choice
        ?? item.choiceValue;
      addChoice(choice);
    };

    for (const item of this.getActorFeatItems(actor)) inspectFeat(item);
    for (const item of asArray(pending?.selectedFeats)) inspectFeat(item);
    for (const item of asArray(pending?.grantedFeats)) inspectFeat(item);

    const actorState = this.getActorChoiceState(actor);
    const actorStored = actorState?.superior_tech ?? actorState?.tech_category;
    for (const entry of asArray(actorStored)) addChoice(entry);

    return allOptions.filter(option => !selectedKeys.has(this.getSelectedChoiceKey(option)));
  }

  static _resolveSkillChoiceOptions(actor, context = {}, { trainedOnly = false, excludeTrained = false } = {}) {
    const pending = context?.pending || context || {};
    const entries = new Map();

    const add = (keyLike, record = {}, source = 'actor', forceTrained = null) => {
      const rawKey = firstScalar(keyLike, record?.key, record?.slug, record?.id, record?._id, record?.name, record?.label);
      const id = normalizeSkillChoiceKey(rawKey);
      if (!id) return;
      const trained = forceTrained === null ? isTrainedSkillRecord(record) : Boolean(forceTrained);
      const previous = entries.get(id) || {};
      entries.set(id, {
        id,
        value: id,
        label: previous.label || labelForSkill(id, firstScalar(record?.label, record?.name, rawKey)),
        trained: Boolean(previous.trained || trained),
        source: previous.source || source
      });
    };

    const actorSkills = actor?.system?.skills || {};
    if (Array.isArray(actorSkills)) {
      for (const skill of actorSkills) add(skill, skill, 'actor.system.skills');
    } else {
      for (const [key, skill] of Object.entries(actorSkills)) add(key, skill, 'actor.system.skills');
    }

    const selectedSkillPools = [
      pending?.selectedSkills,
      pending?.trainedSkills,
      pending?.skills?.trained,
      pending?.characterData?.skills?.trained
    ];
    for (const pool of selectedSkillPools) {
      for (const entry of asArray(pool)) add(entry, entry, 'pending.selectedSkills', true);
    }

    const pendingSkillsObject = pending?.skills && !Array.isArray(pending.skills) ? pending.skills : null;
    if (pendingSkillsObject) {
      for (const [key, value] of Object.entries(pendingSkillsObject)) {
        if (key === 'trained' && Array.isArray(value)) continue;
        add(key, value, 'pending.skills', isTrainedSkillRecord(value));
      }
    }

    let options = Array.from(entries.values());
    if (trainedOnly) options = options.filter(option => option.trained);
    if (excludeTrained) options = options.filter(option => !option.trained);

    return uniqueById(options
      .map(option => normalizeChoiceEntry({ ...option, source: option.trained ? 'Trained' : option.source }))
      .filter(Boolean));
  }

  static _resolvePrerequisiteDerivedOptions(actor, registry, meta, kind, context = {}) {
    switch (kind) {
      case 'weapon_focus':
        return this.getWeaponFocusEligibleChoices(actor, registry, context?.pending || context);
      case 'greater_weapon_focus':
        return this.getWeaponFocusChoices(actor, context?.pending || context).map((entry) => ({
          ...entry,
          prerequisiteSource: 'weapon_focus'
        }));
      case 'weapon_specialization':
        return this.getWeaponSpecializationEligibleChoices(actor, registry, context?.pending || context);
      case 'greater_weapon_specialization':
        return this._getChoiceEntriesByKind(actor, 'weapon_specialization', context?.pending || context).map((entry) => ({
          ...entry,
          prerequisiteSource: 'weapon_specialization'
        }));
      case 'force_power_focus':
        return this.getOwnedForcePowerChoices(actor);
      case 'double_attack_weapon':
        return this.getWeaponFocusEligibleChoices(actor, registry, context?.pending || context);
      case 'triple_attack_weapon':
        return this.getDoubleAttackChoices(actor, context?.pending || context).map((entry) => ({
          ...entry,
          prerequisiteSource: 'double_attack'
        }));
      case 'double_attack_followup_weapon':
        return this.getDoubleAttackChoices(actor, context?.pending || context).map((entry) => ({
          ...entry,
          prerequisiteSource: 'double_attack'
        }));
      case 'return_fire_weapon':
        return this.getWeaponFocusChoices(actor, context?.pending || context).map((entry) => ({
          ...entry,
          prerequisiteSource: 'weapon_focus'
        }));
      case 'melee_weapon_or_group':
        return this.getMeleeWeaponProficiencyChoices(actor, registry, context?.pending || context);
      default:
        return [];
    }
  }

  static _resolveActorStateOptions(actor, registry, meta, kind, context = {}) {
    if (kind === 'talent_choice') return this.getOwnedTalentChoices(actor, context?.pending || context);
    if (kind === 'once_per_encounter_ability_choice') return this.getOncePerEncounterAbilityChoices(actor, context?.pending || context);
    return [];
  }

  static _resolveGrantPoolOptions(actor, registry, meta, kind) {
    const def = registry.choiceKinds?.[kind] || {};
    return [{
      id: kind,
      label: def.label || meta.label || kind,
      value: kind,
      source: 'grantPool',
      deferred: true,
      grantType: meta.grantType || def.grantType || kind,
      countFormula: meta.countFormula || def.countFormula || null,
      registry: meta.grantRegistry || def.registry || null,
      note: 'Grant-pool options are resolved by their dedicated progression registry/dialog.'
    }];
  }


  static getSelectedChoiceKey(choice) {
    const entry = Array.isArray(choice) ? choice[0] : choice;
    if (!entry) return '';
    if (typeof entry === 'string') return stableKey(entry);
    if (Array.isArray(entry.targets) && entry.targets.length) {
      return entry.targets.map(value => stableKey(value)).filter(Boolean).join('__');
    }
    if (entry.decrease && entry.increase) {
      return `decrease_${stableKey(entry.decrease)}__increase_${stableKey(entry.increase)}`;
    }
    if (entry.group === 'exotic' || entry.branch === 'exotic' || entry.weapon) {
      return `exotic:${stableKey(entry.category || entry.exoticCategory || 'unknown')}:${stableKey(entry.weapon || entry.value || entry.id)}`;
    }
    return stableKey(entry.group || entry.value || entry.id || entry.label || entry.name);
  }

  static getChoiceProviderState(actor, registry = this._registry || {}) {
    return {
      weaponProficiencies: this.getWeaponProficiencyChoices(actor, registry),
      weaponFocus: this.getWeaponFocusChoices(actor),
      weaponSpecialization: this._getChoiceEntriesByKind(actor, 'weapon_specialization'),
      lockedWeaponProficiencies: this.getWeaponProficiencyChoices(actor, registry).filter(entry => entry.locked),
      editableWeaponProficiencies: this.getWeaponProficiencyChoices(actor, registry).filter(entry => !entry.locked)
    };
  }

  static isDuplicateChoice(actor, itemOrFeat, selectedChoice, context = {}) {
    const meta = this.getChoiceMeta(itemOrFeat);
    if (!meta?.repeatable) return false;
    const targetKey = this.getSelectedChoiceKey(selectedChoice);
    if (!targetKey) return false;
    const itemId = itemOrFeat?.id || itemOrFeat?._id;
    for (const item of this.getAvailableFeatItems(actor, context?.pending || context)) {
      if ((item.id || item._id) && (item.id || item._id) === itemId) continue;
      if (String(item.name || '').toLowerCase() !== String(itemOrFeat?.name || '').toLowerCase()) continue;
      const otherKey = this.getSelectedChoiceKey(this.getStoredChoice(actor, item));
      if (otherKey && otherKey === targetKey) return true;
    }
    return false;
  }

  static async validateSelectedChoice(actor, itemOrFeat, selectedChoice, context = {}) {
    const options = await this.resolveOptions(actor, itemOrFeat, context);
    const meta = this.getChoiceMeta(itemOrFeat);
    const registry = await this.loadRegistry();
    const selectedKey = this.getSelectedChoiceKey(selectedChoice);
    const optionKeys = new Set(options.map(opt => this.getSelectedChoiceKey(opt) || stableKey(opt?.id || opt?.value || opt?.label)));
    const errors = [];
    let isKnownNestedExotic = false;
    const selected = Array.isArray(selectedChoice) ? selectedChoice[0] : selectedChoice;
    if (meta?.choiceKind === 'weapon_proficiency' && (selected?.group === 'exotic' || selected?.weapon)) {
      const category = selected?.category || selected?.exoticCategory;
      const weapon = String(selected?.weapon || selected?.label || '').toLowerCase();
      isKnownNestedExotic = Boolean(category && (registry.exoticWeapons?.[category] || []).some(entry => String(entry).toLowerCase() === weapon));
    }
    if (selectedKey && optionKeys.size > 0 && !optionKeys.has(selectedKey) && !isKnownNestedExotic) {
      errors.push('Selected choice is not currently legal for this actor.');
    }
    if (this.isDuplicateChoice(actor, itemOrFeat, selectedChoice, context)) {
      errors.push('This choice is already selected by another instance of the same feat.');
    }
    const dependency = this.validateChoiceDependencies(actor, itemOrFeat, selectedChoice, context);
    if (!dependency.valid) errors.push(...dependency.errors);
    return { valid: errors.length === 0, errors, options };
  }

  static getWeaponProficiencyChoices(actor, registry = this._registry || {}, pending = {}) {
    const results = [];
    const addGroup = (value, source = 'actor', locked = false) => {
      if (isPlaceholderWeaponChoice(value)) return;
      const canonical = weaponGroupCanonicalValue(registry, value);
      const id = stableKey(canonical);
      if (!id) return;
      const group = findWeaponGroup(registry, canonical) || findWeaponGroup(registry, value);
      results.push({
        id,
        value: id,
        group: group?.id || canonical,
        label: group?.label || String(value),
        kind: 'weapon_group',
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };
    const addExotic = (entry, source = 'actor', locked = false) => {
      const weapon = typeof entry === 'string' ? entry : entry?.weapon || entry?.label || entry?.name || entry?.value;
      if (!weapon) return;
      const category = typeof entry === 'object' ? entry.category || entry.exoticCategory : this._findExoticCategory(registry, weapon);
      results.push({
        id: `exotic:${stableKey(category || 'unknown')}:${stableKey(weapon)}`,
        value: stableKey(weapon),
        label: weapon,
        kind: 'exotic_weapon',
        group: 'exotic',
        category: category || null,
        weapon,
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };
    const coerceWeaponGroupGrant = (entry) => {
      const raw = typeof entry === 'string'
        ? entry
        : entry?.group || entry?.weaponGroup || entry?.proficiency || entry?.name || entry?.label || entry?.value || '';
      const text = String(raw || '').trim();
      if (!text) return '';
      const parenthetical = text.match(/weapon\s+proficiency\s*\(([^)]+)\)/i)?.[1];
      const withoutPrefix = (parenthetical || text)
        .replace(/^proficien(?:t|cy)\s+(?:with|in)\s+/i, '')
        .replace(/^weapon\s+proficiency\s*[-:]?\s*/i, '')
        .replace(/^advanced\s+melee\s+weapon\s+proficiency$/i, 'advanced melee weapons')
        .replace(/^heavy\s+weapon\s+proficiency$/i, 'heavy weapons')
        .trim();
      if (isPlaceholderWeaponChoice(withoutPrefix)) return '';
      const aliasKey = stableKey(withoutPrefix);
      const aliases = {
        simple_weapons: 'simple',
        simple_weapon: 'simple',
        advanced_melee_weapons: 'advanced-melee',
        advanced_melee_weapon: 'advanced-melee',
        heavy_weapons: 'heavy-weapons',
        heavy_weapon: 'heavy-weapons',
        light_melee_weapons: 'simple',
        simple_melee_weapons: 'simple',
        simple_ranged_weapons: 'simple',
      };
      return aliases[aliasKey] || withoutPrefix;
    };

    for (const value of asArray(actor?.system?.weaponProficiencies)) addGroup(value, 'system.weaponProficiencies', true);
    for (const value of asArray(actor?._unlockGrants?.proficiencies?.weapon)) addGroup(value, '_unlockGrants.weapon', true);
    for (const value of asArray(actor?._unlockGrants?.proficiencies?.exotic)) addExotic(value, '_unlockGrants.exotic', true);

    for (const entry of asArray(pending?.grantedProficiencies)) {
      const type = String(entry?.type || entry?.kind || entry?.proficiencyType || '').toLowerCase();
      const label = entry?.weapon || entry?.group || entry?.name || entry?.label || entry?.value || entry;
      const text = String(label || '').toLowerCase();
      if (!label || type === 'armor' || /armor proficiency|light armor|medium armor|heavy armor/.test(text)) continue;
      if (type === 'exotic' || entry?.branch === 'exotic' || entry?.weapon) addExotic(entry, 'pending.grantedProficiencies', true);
      else addGroup(coerceWeaponGroupGrant(entry), 'pending.grantedProficiencies', true);
    }

    for (const item of this.getAvailableFeatItems(actor, pending)) {
      const meta = this.getChoiceMeta(item);
      const staticGrants = asArray(meta?.grants || item.system?.abilityMeta?.grants)
        .flatMap((grant) => Array.isArray(grant?.proficiencies) ? grant.proficiencies : []);
      for (const value of staticGrants) addGroup(value, `feat:${item.name}`, this.isClassGrantedItem(item));

      const choice = this.getStoredChoice(actor, item);
      if (meta?.choiceKind === 'weapon_proficiency' && choice) {
        for (const entry of asArray(choice)) {
          const group = typeof entry === 'string' ? entry : entry?.group || entry?.value || entry?.id;
          if (group === 'exotic' || entry?.branch === 'exotic' || entry?.weapon) addExotic(entry, `choice:${item.name}`, this.isClassGrantedItem(item));
          else addGroup(group, `choice:${item.name}`, this.isClassGrantedItem(item));
        }
      }
    }

    const byName = new Map([
      ['weapon proficiency (simple weapons)', 'simple'],
      ['weapon proficiency (pistols)', 'pistols'],
      ['weapon proficiency (rifles)', 'rifles'],
      ['weapon proficiency (heavy weapons)', 'heavy-weapons'],
      ['heavy weapon proficiency', 'heavy-weapons'],
      ['advanced melee weapon proficiency', 'advanced-melee']
    ]);
    for (const item of this.getAvailableFeatItems(actor, pending)) {
      const group = byName.get(String(item.name || '').toLowerCase());
      if (group) addGroup(group, `feat:${item.name}`, this.isClassGrantedItem(item));
    }

    return uniqueById(results);
  }

  static getWeaponFocusEligibleChoices(actor, registry = this._registry || {}, pending = {}) {
    return this.getWeaponProficiencyChoices(actor, registry, pending).map((entry) => ({
      ...entry,
      prerequisiteSource: 'weapon_proficiency',
      providerLocked: Boolean(entry?.locked),
      providerSource: entry?.source || null,
      locked: false,
      editable: true
    }));
  }

  static getMeleeWeaponProficiencyChoices(actor, registry = this._registry || {}, pending = {}) {
    const meleeGroups = new Set(['simple', 'advanced-melee', 'lightsabers']);
    return this.getWeaponProficiencyChoices(actor, registry, pending)
      .filter((entry) => {
        if (entry?.group === 'exotic') return String(entry?.category || '').toLowerCase() === 'melee';
        const group = stableKey(entry?.group || entry?.value || entry?.id);
        return meleeGroups.has(group);
      })
      .map((entry) => ({
        ...entry,
        prerequisiteSource: 'weapon_proficiency',
        meleeOnly: true,
        locked: false,
        editable: true
      }));
  }

  static getDoubleAttackChoices(actor, pending = {}) {
    return this._getChoiceEntriesByFeatName(actor, 'Double Attack', pending);
  }

  static getOwnedWeaponChoices(actor, pending = {}) {
    const results = [];
    const add = (entry, source = 'actor.item', locked = false) => {
      const label = typeof entry === 'string' ? entry : entry?.name || entry?.label || entry?.weapon || entry?.id;
      if (!label) return;
      results.push({
        id: stableKey(label),
        value: stableKey(label),
        label: String(label),
        weapon: String(label),
        kind: 'specific_weapon',
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };

    add('Unarmed Attack', 'default.unarmed', true);
    for (const item of asArray(actor?.items)) {
      const type = String(item?.type || '').toLowerCase();
      const systemType = String(item?.system?.itemType || item?.system?.type || item?.system?.category || '').toLowerCase();
      if (type === 'weapon' || systemType.includes('weapon')) add(item, `item:${item.name}`);
    }
    for (const entry of asArray(pending?.weapons || pending?.selectedWeapons)) add(entry, 'pending.weapon');
    return uniqueById(results);
  }

  static getOwnedTalentChoices(actor, pending = {}) {
    const results = [];
    const add = (entry, source = 'actor.talent', locked = false) => {
      const label = typeof entry === 'string' ? entry : entry?.name || entry?.label || entry?.talent || entry?.id;
      if (!label) return;
      results.push({
        id: stableKey(label),
        value: stableKey(label),
        label: String(label),
        talent: String(label),
        kind: 'talent',
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };
    for (const item of this.getActorTalentItems(actor)) add(item, `talent:${item.name}`);
    for (const entry of asArray(pending?.selectedTalents || pending?.talents)) add(entry, 'pending.talent');
    return uniqueById(results);
  }

  static getOncePerEncounterAbilityChoices(actor, pending = {}) {
    const results = [];
    const add = (entry, source = 'actor', locked = false) => {
      const label = typeof entry === 'string' ? entry : entry?.name || entry?.label || entry?.id;
      if (!label) return;
      const system = typeof entry === 'object' ? (entry.system || {}) : {};
      const searchable = [
        label,
        system.description?.value,
        system.description,
        system.benefit,
        system.effect,
        system.shortSummary,
        system.abilityMeta?.conditionSummary,
        JSON.stringify(system.abilityMeta || {})
      ].filter(Boolean).join(' ').toLowerCase();
      if (!/once per encounter|1\/encounter|one additional time per encounter|per encounter/.test(searchable)) return;
      results.push({
        id: stableKey(`${source}:${label}`),
        value: stableKey(label),
        label: String(label),
        kind: String(entry?.type || 'ability'),
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };
    for (const item of [...this.getActorFeatItems(actor), ...this.getActorTalentItems(actor)]) add(item, `${item.type}:${item.name}`);
    for (const entry of asArray(pending?.selectedFeats || pending?.feats)) add(entry, 'pending.feat');
    for (const entry of asArray(pending?.selectedTalents || pending?.talents)) add(entry, 'pending.talent');
    return uniqueById(results);
  }

  static getWeaponFocusChoices(actor, pending = {}) {
    return this._getChoiceEntriesByKind(actor, 'weapon_focus', pending);
  }

  static getWeaponSpecializationEligibleChoices(actor, registry = this._registry || {}, pending = {}) {
    const existingFocus = this.getWeaponFocusChoices(actor, pending);
    if (existingFocus.length > 0) {
      return existingFocus.map((entry) => ({
        ...entry,
        prerequisiteSource: 'weapon_focus',
        providerLocked: Boolean(entry?.locked),
        providerSource: entry?.source || null,
        locked: false,
        editable: true
      }));
    }
    return this.getWeaponFocusEligibleChoices(actor, registry, pending).map((entry) => ({
      ...entry,
      prerequisiteSource: 'weapon_proficiency_fallback',
      unresolvedPrerequisite: true,
      locked: false,
      editable: true
    }));
  }

  static getOwnedForcePowerChoices(actor) {
    const owned = [];
    const add = (entry, source = 'actor', locked = false) => {
      const label = typeof entry === 'string' ? entry : entry?.name || entry?.label || entry?.power || entry?.id;
      if (!label) return;
      owned.push({
        id: stableKey(label),
        value: stableKey(label),
        label: String(label),
        kind: 'force_power',
        source,
        locked: Boolean(locked),
        editable: !locked
      });
    };

    for (const value of asArray(actor?.system?.force?.powers)) add(value, 'system.force.powers');
    for (const value of asArray(actor?.system?.forcePowers)) add(value, 'system.forcePowers');
    for (const value of asArray(actor?.flags?.swse?.forcePowers)) add(value, 'flags.swse.forcePowers');
    for (const item of asArray(actor?.items)) {
      if (String(item?.type || '').toLowerCase().includes('force') || item?.system?.isForcePower) {
        add(item, `item:${item.name}`);
      }
    }

    return uniqueById(owned);
  }

  static _getChoiceEntriesByKind(actor, kind, pending = {}) {
    const owned = [];
    for (const item of this.getAvailableFeatItems(actor, pending)) {
      const meta = this.getChoiceMeta(item);
      if (meta?.choiceKind !== kind) continue;
      const stored = this.getStoredChoice(actor, item);
      for (const entry of asArray(stored)) {
        const normalized = normalizeChoiceEntry(entry);
        if (normalized) owned.push({ ...normalized, source: `feat:${item.name}`, itemId: item.id || item._id });
      }
    }
    if (owned.length) return uniqueById(owned);
    const choices = this.getActorChoiceState(actor);
    const candidates = [kind, stableKey(kind), nameKey(kind)].filter(Boolean);
    let stored;
    for (const key of candidates) {
      if (choices[key] !== undefined) {
        stored = choices[key];
        break;
      }
    }
    return asArray(stored).map(normalizeChoiceEntry).filter(Boolean);
  }

  static _getChoiceEntriesByFeatName(actor, featName, pending = {}) {
    const target = nameKey(featName);
    const owned = [];
    for (const item of this.getAvailableFeatItems(actor, pending)) {
      if (nameKey(item?.name) !== target) continue;
      const stored = this.getStoredChoice(actor, item);
      for (const entry of asArray(stored)) {
        const normalized = normalizeChoiceEntry(entry);
        if (normalized) owned.push({ ...normalized, source: `feat:${item.name}`, itemId: item.id || item._id });
      }
    }
    return uniqueById(owned);
  }

  static _findExoticCategory(registry, weapon) {
    const key = String(weapon || '').toLowerCase();
    for (const category of Object.keys(registry.exoticWeapons || {})) {
      const list = registry.exoticWeapons?.[category];
      if (Array.isArray(list) && list.some((entry) => String(entry).toLowerCase() === key)) return category;
    }
    return null;
  }


  static _choiceKeysFor(entries = []) {
    return new Set(asArray(entries).map((entry) => this.getSelectedChoiceKey(entry)).filter(Boolean));
  }

  static validateChoiceDependencies(actor, itemOrFeat, selectedChoice = null, context = {}) {
    const meta = this.getChoiceMeta(itemOrFeat);
    const kind = meta?.choiceKind;
    const key = this.getSelectedChoiceKey(selectedChoice ?? this.getStoredChoice(actor, itemOrFeat));
    if (!kind || !key) return { valid: true, errors: [] };

    const pending = context?.pending || context || {};
    const registry = this._registry || {};
    const dependencyMap = {
      weapon_focus: {
        providers: () => this.getWeaponProficiencyChoices(actor, registry, pending),
        message: (label) => `Requires proficiency with ${label}.`
      },
      greater_weapon_focus: {
        providers: () => this.getWeaponFocusChoices(actor, pending),
        message: (label) => `Requires Weapon Focus with ${label}.`
      },
      weapon_specialization: {
        providers: () => this.getWeaponFocusChoices(actor, pending),
        message: (label) => `Requires Weapon Focus with ${label}.`
      },
      greater_weapon_specialization: {
        providers: () => this._getChoiceEntriesByKind(actor, 'weapon_specialization', pending),
        message: (label) => `Requires Weapon Specialization with ${label}.`
      },
      triple_attack_weapon: {
        providers: () => this.getDoubleAttackChoices(actor, pending),
        message: (label) => `Requires Double Attack with ${label}.`
      },
      double_attack_followup_weapon: {
        providers: () => this.getDoubleAttackChoices(actor, pending),
        message: (label) => `Requires Double Attack with ${label}.`
      },
      return_fire_weapon: {
        providers: () => this.getWeaponFocusChoices(actor, pending),
        message: (label) => `Requires Weapon Focus with ${label}.`
      }
    };

    const rule = dependencyMap[kind];
    if (!rule) return { valid: true, errors: [] };
    const providerKeys = this._choiceKeysFor(rule.providers());
    if (providerKeys.has(key)) return { valid: true, errors: [] };
    const label = this.getChoiceLabel(selectedChoice ?? this.getStoredChoice(actor, itemOrFeat)) || key;
    return { valid: false, errors: [rule.message(label)] };
  }

  static getChoiceLabel(choice) {
    const entry = Array.isArray(choice) ? choice[0] : choice;
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    return entry.label || entry.weapon || entry.group || entry.value || entry.id || '';
  }

  static async getMissingChoices(actor, { includeTalents = false } = {}) {
    const items = [
      ...this.getActorFeatItems(actor),
      ...(includeTalents ? this.getActorTalentItems(actor) : [])
    ];
    const missing = [];

    for (const item of items) {
      const meta = this.getChoiceMeta(item);
      if (!meta?.required) continue;
      if (meta.resolution === 'already_resolved_static_variant') continue;
      if (this.hasStoredChoice(actor, item)) continue;

      const options = await this.resolveOptions(actor, item);
      missing.push({
        itemId: item.id || item._id,
        itemName: item.name,
        itemType: item.type,
        choiceKind: meta.choiceKind || null,
        choiceSource: this.inferChoiceSource(item),
        status: 'missing',
        required: true,
        repeatable: Boolean(meta.repeatable),
        storagePath: meta.storagePath || `${DEFAULT_CHOICE_ROOT}.${stableKey(meta.choiceKind || item.name)}`,
        optionCount: options.length,
        options,
        deferred: this.inferChoiceSource(item) === 'grantPool'
      });
    }

    FeatDiagnostics.traceChoiceAudit({
      actor,
      label: 'missing required choices',
      items: missing,
      includeTalents,
    });

    return missing;
  }


  static async getInvalidChoices(actor) {
    const invalid = [];
    for (const item of this.getActorFeatItems(actor)) {
      const meta = this.getChoiceMeta(item);
      if (!meta?.required || !this.hasStoredChoice(actor, item)) continue;
      if (this.isClassGrantedItem(item)) continue;
      const selectedChoice = this.getStoredChoice(actor, item);
      const validation = await this.validateSelectedChoice(actor, item, selectedChoice);
      if (!validation.valid) {
        invalid.push({
          itemId: item.id || item._id,
          itemName: item.name,
          choiceKind: meta.choiceKind || null,
          status: 'invalid',
          selectedChoice,
          errors: validation.errors,
          options: validation.options
        });
      }
    }
    FeatDiagnostics.traceChoiceAudit({
      actor,
      label: 'invalid stored choices',
      items: invalid,
      includeTalents: false,
    });

    return invalid;
  }

  static getChoiceStatusSync(actor, item) {
    const meta = this.getChoiceMeta(item);
    if (!meta?.required) return null;
    const selectedChoice = this.getStoredChoice(actor, item);
    const isLocked = this.isClassGrantedItem(item);
    const dependency = selectedChoice && !isLocked
      ? this.validateChoiceDependencies(actor, item, selectedChoice)
      : { valid: true, errors: [] };
    return {
      required: true,
      locked: isLocked,
      editable: !isLocked,
      missing: !this.hasStoredChoice(actor, item),
      invalid: !dependency.valid,
      invalidReasons: dependency.errors || [],
      selectedChoice,
      choiceKind: meta.choiceKind || null,
      choiceSource: this.inferChoiceSource(item)
    };
  }

  static buildChoicePatch(itemOrFeat, selectedChoice) {
    const meta = this.getChoiceMeta(itemOrFeat);
    if (!meta) return null;
    const patch = {};
    setPropertySafe(patch, 'system.selectedChoice', selectedChoice);
    setPropertySafe(patch, 'system.choiceResolved', true);
    setPropertySafe(patch, 'system.choiceResolvedAt', new Date().toISOString());
    return patch;
  }
}

export { stableKey as normalizeFeatChoiceKey };
export default FeatChoiceResolver;
