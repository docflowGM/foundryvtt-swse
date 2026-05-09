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
  if (value instanceof Set) return Array.from(value);
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
      'force_power_focus'
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

    if (source === 'fixed') {
      return this._resolveFixedOptions(actor, registry, meta, kind, itemOrFeat, context);
    }

    if (source === 'prerequisiteDerived') {
      return this._resolvePrerequisiteDerivedOptions(actor, registry, meta, kind, context);
    }

    if (source === 'grantPool') {
      return this._resolveGrantPoolOptions(actor, registry, meta, kind, context);
    }

    return [];
  }

  static _resolveFixedOptions(actor, registry, meta, kind, itemOrFeat = null, context = {}) {
    const fromMeta = meta.fixedOptions || meta.options;
    if (Array.isArray(fromMeta)) return uniqueById(fromMeta.map(normalizeChoiceEntry).filter(Boolean));

    if (kind === 'weapon_proficiency') {
      const owned = new Set(this.getWeaponProficiencyChoices(actor, registry, context?.pending || context).map(entry => this.getSelectedChoiceKey(entry)));
      return uniqueById((registry.weaponGroups || []).map(normalizeChoiceEntry).filter(Boolean))
        .filter(option => !owned.has(this.getSelectedChoiceKey(option)));
    }

    if (kind === 'skill_focus' || kind === 'skill_training') {
      const skills = actor?.system?.skills || {};
      return Object.entries(skills).map(([key, skill]) => normalizeChoiceEntry({
        id: key,
        value: key,
        label: skill?.label || skill?.name || key,
        trained: Boolean(skill?.trained || skill?.value?.trained)
      })).filter(Boolean);
    }

    const def = registry.choiceKinds?.[kind];
    const options = def?.options || def?.fixedOptions || [];
    return uniqueById(options.map(normalizeChoiceEntry).filter(Boolean));
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
      default:
        return [];
    }
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
      const id = stableKey(value);
      if (!id) return;
      const group = (registry.weaponGroups || []).find((entry) => entry.id === id || entry.proficiencyValue === id);
      results.push({
        id,
        value: id,
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

    for (const value of asArray(actor?.system?.weaponProficiencies)) addGroup(value, 'system.weaponProficiencies', true);
    for (const value of asArray(actor?._unlockGrants?.proficiencies?.weapon)) addGroup(value, '_unlockGrants.weapon', true);
    for (const value of asArray(actor?._unlockGrants?.proficiencies?.exotic)) addExotic(value, '_unlockGrants.exotic', true);

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
      prerequisiteSource: 'weapon_proficiency'
    }));
  }

  static getWeaponFocusChoices(actor, pending = {}) {
    return this._getChoiceEntriesByKind(actor, 'weapon_focus', pending);
  }

  static getWeaponSpecializationEligibleChoices(actor, registry = this._registry || {}, pending = {}) {
    const existingFocus = this.getWeaponFocusChoices(actor, pending);
    if (existingFocus.length > 0) {
      return existingFocus.map((entry) => ({
        ...entry,
        prerequisiteSource: 'weapon_focus'
      }));
    }
    return this.getWeaponFocusEligibleChoices(actor, registry, pending).map((entry) => ({
      ...entry,
      prerequisiteSource: 'weapon_proficiency_fallback',
      unresolvedPrerequisite: true
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
