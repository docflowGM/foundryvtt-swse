/**
 * ModifierEngine.js — Unified Modifier Pipeline (Phase 0)
 *
 * Responsibilities:
 * - Collect modifiers from all sources (feats, talents, species, encumbrance, conditions)
 * - Convert all sources to canonical Modifier objects
 * - Aggregate and apply stacking rules
 * - Inject resolved modifiers into derived data
 * - Provide modifier breakdowns for UI display
 *
 * Single source of truth for modifier math.
 */

import { ModifierType, ModifierSource, createModifier, isValidModifier } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import ModifierUtils from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { EncumbranceEngine } from "/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js";
import { WeaponsEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js";
import { StructuredRuleEvaluator } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/StructuredRuleEvaluator.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ConditionEvaluator } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/condition-evaluator.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import {
  actorHasArmorProficiencyForArmor,
  getArmorProficiencyPenalty,
  isEnergyShieldItem,
  resolveArmorData
} from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { EffectIntentEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js";

export class ModifierEngine {

  static _modifierSourceCache = new Map();
  static _aggregateCache = new Map();
  static _breakdownCache = new Map();
  static _modifierCacheOrder = [];
  static _aggregateCacheOrder = [];
  static _breakdownCacheOrder = [];
  static _modifierCacheMax = 160;
  static _aggregateCacheMax = 160;
  static _breakdownCacheMax = 160;

  static _cloneCacheValue(value) {
    if (value == null || typeof value !== 'object') return value;
    try {
      if (typeof structuredClone === 'function') return structuredClone(value);
    } catch (_err) {
      // Fall through.
    }
    try {
      return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  static _rememberBounded(cache, order, key, value, max) {
    if (!key) return;
    cache.set(key, this._cloneCacheValue(value));
    const existing = order.indexOf(key);
    if (existing >= 0) order.splice(existing, 1);
    order.push(key);
    while (order.length > max) {
      const stale = order.shift();
      if (stale) cache.delete(stale);
    }
  }

  static clearCaches(actorId = null) {
    if (!actorId) {
      this._modifierSourceCache.clear();
      this._aggregateCache.clear();
      this._breakdownCache.clear();
      this._modifierCacheOrder.length = 0;
      this._aggregateCacheOrder.length = 0;
      this._breakdownCacheOrder.length = 0;
      return;
    }
    const prefix = `${actorId}|`;
    for (const key of Array.from(this._modifierSourceCache.keys())) {
      if (key.startsWith(prefix)) this._modifierSourceCache.delete(key);
    }
    for (const key of Array.from(this._aggregateCache.keys())) {
      if (key.startsWith(prefix)) this._aggregateCache.delete(key);
    }
    for (const key of Array.from(this._breakdownCache.keys())) {
      if (key.startsWith(prefix)) this._breakdownCache.delete(key);
    }
    this._modifierCacheOrder = this._modifierCacheOrder.filter(key => !key.startsWith(prefix));
    this._aggregateCacheOrder = this._aggregateCacheOrder.filter(key => !key.startsWith(prefix));
    this._breakdownCacheOrder = this._breakdownCacheOrder.filter(key => !key.startsWith(prefix));
  }

  static _safeJson(value) {
    try { return JSON.stringify(value ?? null); }
    catch (_err) { return 'unserializable'; }
  }

  static _targetsSignature(targets = []) {
    if (!Array.isArray(targets) || targets.length === 0) return '';
    return targets.map(target => String(target || '')).filter(Boolean).sort().join('|');
  }

  static _actorModifierSourceSignature(actor) {
    if (!actor?.id) return null;
    const attributes = actor?.system?.attributes ?? actor?.system?.abilities ?? {};
    const strength = attributes?.str ?? attributes?.strength ?? {};
    const sourceState = {
      race: actor?.system?.race ?? null,
      species: actor?.system?.species ?? null,
      profession: actor?.system?.profession ?? null,
      level: actor?.system?.level ?? actor?.system?.progression?.level ?? null,
      size: actor?.system?.size ?? null,
      skills: actor?.system?.skills ?? null,
      strength: {
        base: strength?.base ?? null,
        racial: strength?.racial ?? strength?.species ?? null,
        enhancement: strength?.enhancement ?? strength?.misc ?? null,
        temp: strength?.temp ?? null
      },
      conditionTrack: actor?.system?.conditionTrack ?? null,
      customModifiers: actor?.system?.customModifiers ?? null,
      systemActiveEffects: actor?.system?.activeEffects ?? null,
      flagsSwse: actor?.flags?.swse ?? null,
      flagsSystem: actor?.flags?.['foundryvtt-swse'] ?? null,
      talentFlags: actor?.system?.talentFlags ?? null,
      armorProficiencies: actor?.system?.proficiencies?.armor ?? actor?.system?.armorProficiencies ?? null
    };

    const itemSignature = Array.from(actor?.items ?? [])
      .map(item => [
        item?.id ?? item?._id ?? 'no-id',
        item?.type ?? 'unknown',
        item?._stats?.modifiedTime ?? item?._source?._stats?.modifiedTime ?? item?.system?._version ?? '',
        item?.system?.equipped ?? item?.system?.isEquipped ?? '',
        item?.system?.activated ?? item?.system?.active ?? '',
        item?.system?.quantity ?? '',
        item?.system?.uses?.value ?? item?.system?.ammo?.value ?? ''
      ].join(':'))
      .sort()
      .join('|');

    const effectSignature = Array.from(actor?.effects ?? [])
      .map(effect => [
        effect?.id ?? effect?._id ?? 'no-id',
        effect?._stats?.modifiedTime ?? effect?._source?._stats?.modifiedTime ?? '',
        effect?.disabled === true ? 'disabled' : 'enabled',
        effect?.origin ?? ''
      ].join(':'))
      .sort()
      .join('|');

    return [
      actor.id,
      actor.type ?? 'actor',
      actor._swseAbilityRegistrationSignature ?? '',
      this._safeJson(sourceState),
      itemSignature,
      effectSignature
    ].join('|');
  }

  /**
   * Collect all modifiers from every source for an actor
   *
   * Sources:
   * 1. Feats (skillBonuses, defenseModifiers, initiativeBonus)
   * 2. Talents (same as feats)
   * 3. Species (skillBonuses, ability modifiers)
   * 4. Encumbrance (skillPenalties, speedPenalties)
   * 5. Conditions (conditional penalties)
   * 6. Items (equipment/armor bonuses)
   * 7. Custom (user-defined effects)
   *
   * @param {Actor} actor
   * @returns {Modifier[]} Array of all collected modifiers
   */
  /**
   * Safely normalize any value to an array for spreading
   * Protects against null, undefined, or non-iterable sources
   * @private
   */
  static _safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  static _hasRuntimeContext(context = {}) {
    return !!context && typeof context === 'object' && Object.keys(context).length > 0;
  }

  static _modifierPredicates(modifier = {}) {
    const explicit = Array.isArray(modifier.predicateRequirements) ? modifier.predicateRequirements : [];
    const legacy = Array.isArray(modifier.predicates) ? modifier.predicates : [];
    return [...new Set([...explicit, ...legacy].filter(Boolean))];
  }

  static _hasRequiredSelectedChoice(modifier = {}) {
    if (modifier.requiresSelectedChoice !== true) return true;
    if (modifier.choiceResolved === true) return true;
    const selected = modifier.selectedChoice || modifier.selectedChoices;
    if (Array.isArray(selected)) return selected.length > 0;
    return !!selected;
  }

  /**
   * Phase 3 static-vs-context guard.
   *
   * Default actor preparation is a static sheet context. Only true always-on
   * modifiers, plus selected-choice static modifiers that have already resolved
   * to a concrete target, may enter static totals. Roll/context/target-specific
   * modifiers fail closed until the caller supplies a real runtime context and
   * their predicates pass.
   */
  static isModifierAllowedInContext(actor, modifier = {}, context = {}, options = {}) {
    if (!modifier || modifier.enabled === false) return false;

    const policy = String(modifier.staticSheetPolicy || 'include');
    const staticSheet = options?.staticSheet === true;
    const runtimeRequired = modifier.requiresRuntimeContext === true;

    if (staticSheet) {
      if (policy === 'selected_choice_only') return this._hasRequiredSelectedChoice(modifier);
      return policy === 'include' || policy === 'selected_choice_only';
    }

    if (!this._hasRequiredSelectedChoice(modifier)) return false;

    if (['manual_only', 'manual_review', 'not_a_modifier'].includes(policy)) {
      return false;
    }

    const hasRuntimeContext = this._hasRuntimeContext(context);
    if ((runtimeRequired || ['roll_context_only', 'contextual_only', 'manual_or_contextual_only', 'exclude'].includes(policy)) && !hasRuntimeContext) {
      return false;
    }

    const predicates = this._modifierPredicates(modifier);
    if (predicates.length > 0) {
      if (!hasRuntimeContext) return false;
      try {
        const predicateContext = {
          ...context,
          modifier,
          selectedChoice: context?.selectedChoice ?? modifier.selectedChoice ?? null
        };
        return evaluateStatePredicates(actor, predicates, predicateContext);
      } catch (err) {
        swseLogger.warn(`[ModifierEngine] Predicate evaluation failed for ${modifier.sourceName || modifier.id || 'modifier'}`, err);
        return false;
      }
    }

    return true;
  }

  static async getAllModifiers(actor) {
    if (!actor) return [];

    const cacheKey = this._actorModifierSourceSignature(actor);
    if (cacheKey && this._modifierSourceCache.has(cacheKey)) {
      return this._cloneCacheValue(this._modifierSourceCache.get(cacheKey));
    }

    const modifiers = [];

    try {
      // Source 1: Feats
      modifiers.push(...this._safeArray(this._getFeatModifiers(actor)));

      // Source 2: Talents
      modifiers.push(...this._safeArray(this._getTalentModifiers(actor)));

      // Source 3: Species
      modifiers.push(...this._safeArray(this._getSpeciesModifiers(actor)));

      // Source 3b: Background bonuses (Phase 4 - occupations, events, planets)
      modifiers.push(...this._safeArray(this._getBackgroundModifiers(actor)));

      // Source 4: Encumbrance
      modifiers.push(...this._safeArray(this._getEncumbranceModifiers(actor)));

      // Source 5: Conditions
      modifiers.push(...this._safeArray(this._getConditionModifiers(actor)));

      // Source 6: Items (equipment/armor)
      modifiers.push(...this._safeArray(this._getItemModifiers(actor)));

      // Source 6b: Weapons (centralized through WeaponsEngine)
      modifiers.push(...this._safeArray(this._getWeaponModifiers(actor)));

      // Source 7: Droid Modifications (Phase A - droids only)
      if (actor.type === 'droid') {
        modifiers.push(...this._safeArray(await this._getDroidModModifiers(actor)));
      }

      // Source 7b: Vehicle Modifications (Phase 6 - vehicles only)
      if (actor.type === 'vehicle') {
        modifiers.push(...this._safeArray(this._getVehicleModModifiers(actor)));
      }

      // Source 8: Custom modifiers (Phase B - user-defined via UI)
      modifiers.push(...this._safeArray(this._getCustomModifiers(actor)));

      // Source 8b: PASSIVE modifiers (Phase 1 - execution model infrastructure)
      modifiers.push(...this._safeArray(this._getPassiveModifiers(actor)));

      // Source 9: Active Effects (Phase D - temporary/duration-based)
      modifiers.push(...this._safeArray(this._getActiveEffectModifiers(actor)));

      // Source 9b: User-friendly SWSE Active Effect intents from actor/item effects.
      modifiers.push(...this._safeArray(this._getEffectIntentModifiers(actor)));

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers for ${actor.name}`);

      if (cacheKey) this._rememberBounded(this._modifierSourceCache, this._modifierCacheOrder, cacheKey, modifiers, this._modifierCacheMax);
      return this._cloneCacheValue(modifiers);
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error collecting modifiers for ${actor?.name}:`, err);
      return [];
    }
  }

  /**
   * Compatibility collector used by legacy combat preview/resolution code.
   *
   * Newer modifier consumers generally call getAllModifiers(), aggregateTarget(),
   * or ModifierEngineExtensions.getModifiersForDomain().  Some combat paths still
   * ask for collectModifiers(actor, { domain, context }).  Keep that contract here
   * so a missing adapter method never blocks an action card or roll dialog.
   *
   * @param {Actor} actor
   * @param {Object} query
   * @param {string} query.domain - Domain/target to collect, such as attack.
   * @param {Object} query.context - Optional roll/action context.
   * @returns {Promise<Array>} Applicable modifier records.
   */
  static async collectModifiers(actor, query = {}) {
    if (!actor) return [];

    const requestedDomain = String(query?.domain ?? query?.target ?? '').trim();
    const requestedLower = requestedDomain.toLowerCase();
    const baseModifiers = await this.getAllModifiers(actor);
    const contextualModifiers = this.getEffectIntentModifiersForContext(actor, {
      context: query?.context ?? {},
      includeBroad: false
    });
    const allModifiers = [...baseModifiers, ...contextualModifiers];

    const matchesDomain = (mod) => {
      if (!requestedLower) return true;
      const candidates = [];
      const pushCandidate = (value) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          value.forEach(pushCandidate);
          return;
        }
        candidates.push(String(value).toLowerCase());
      };

      pushCandidate(mod?.target);
      pushCandidate(mod?.domain);
      pushCandidate(mod?.appliesTo);
      pushCandidate(mod?.key);

      if (requestedLower === 'attack') {
        return candidates.some(value => value === 'attack' || value === 'attack.roll' || value.startsWith('attack.'));
      }

      if (requestedLower === 'bonushitpoints' || requestedLower === 'bonus-hit-points') {
        return candidates.some(value => ['bonushitpoints', 'bonus-hit-points', 'bonushp', 'hp.bonus', 'hp.temp', 'temporary-hit-points'].includes(value));
      }

      return candidates.some(value => value === requestedLower || value.startsWith(`${requestedLower}.`));
    };

    return allModifiers
      .filter(mod => matchesDomain(mod))
      .filter(mod => this.isModifierAllowedInContext(actor, mod, query?.context ?? {}, { staticSheet: false }))
      .filter(mod => {
        try {
          return ConditionEvaluator.evaluateAll(actor, mod?.conditions, query?.context ?? {});
        } catch (_err) {
          return true;
        }
      })
      .map(mod => ({
        ...mod,
        label: mod?.label ?? mod?.name ?? mod?.source ?? 'Modifier',
        value: Number(mod?.value ?? mod?.modifier ?? 0) || 0
      }));
  }


  /**
   * Collect SWSE Basic Active Effect intent modifiers that need a live roll/action
   * context to be safely applied. Broad always-on/self intents are collected by
   * getAllModifiers(); this method optionally includes them for legacy roll paths
   * that do not otherwise ask the ModifierEngine for global attack/damage mods.
   *
   * @param {Actor} actor
   * @param {Object} query
   * @param {Object} query.context - Roll/action context, such as weapon or skill.
   * @param {boolean} query.includeBroad - Include broad non-contextual intents.
   * @returns {Modifier[]}
   */
  static getEffectIntentModifiersForContext(actor, query = {}) {
    const modifiers = [];
    if (!actor) return modifiers;

    const context = query?.context ?? {};
    const includeBroad = query?.includeBroad === true;

    const collectFromEffect = (effect, item = null) => {
      try {
        if (!EffectIntentEngine.hasIntent(effect)) return;

        const broadData = EffectIntentEngine.toModifierData(effect, { actor, item });
        if (includeBroad && broadData) {
          modifiers.push(createModifier({
            source: ModifierSource.EFFECT,
            ...broadData
          }));
        }

        // Avoid double-counting broad self effects when contextual resolution is
        // only being used to add scoped/filtered roll-time effects.
        if (broadData) return;

        const contextualData = EffectIntentEngine.toContextualModifierData(effect, { actor, item, context });
        if (!contextualData) return;
        modifiers.push(createModifier({
          source: ModifierSource.EFFECT,
          ...contextualData
        }));
      } catch (err) {
        swseLogger.warn(`[ModifierEngine] Failed to collect contextual SWSE effect intent modifier`, err);
      }
    };

    try {
      for (const effect of Array.from(actor?.effects ?? [])) {
        const origin = String(effect?.origin ?? effect?.sourceName ?? '');
        if (/\bItem\b/.test(origin)) continue;
        collectFromEffect(effect, null);
      }

      for (const item of Array.from(actor?.items ?? [])) {
        for (const effect of Array.from(item?.effects ?? [])) {
          collectFromEffect(effect, item);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting contextual SWSE effect intent modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Resolve a roll-time modifier total for Basic effect intents.
   * Used by legacy/non-RollCore attack and damage paths so the Basic builder can
   * drive scoped effects like "+2 with pistols" without broad actor leakage.
   *
   * @param {Actor} actor
   * @param {string} target
   * @param {Object} context
   * @param {Object} options
   * @returns {number}
   */
  static getEffectIntentModifierTotalForContext(actor, target, context = {}, options = {}) {
    const modifiers = this.getEffectIntentModifiersForContext(actor, {
      context,
      includeBroad: options?.includeBroad === true
    });
    return ModifierUtils.calculateModifierTotal(modifiers, target);
  }

  /**
   * Aggregate all modifiers: collect, group by target, apply stacking
   *
   * PHASE 2: Evaluate conditions during aggregation.
   * Modifiers with unsatisfied conditions are excluded from aggregation.
   *
   * @param {Actor} actor
   * @returns {Object<string, number>} Map of target → total modifier value
   */
  static async aggregateAll(actor) {
    const cacheKey = this._actorModifierSourceSignature(actor);
    if (cacheKey && this._aggregateCache.has(cacheKey)) {
      return this._cloneCacheValue(this._aggregateCache.get(cacheKey));
    }

    const allModifiers = await this.getAllModifiers(actor);
    const aggregated = {};

    // Group by target
    const staticModifiers = allModifiers.filter(mod => this.isModifierAllowedInContext(actor, mod, {}, { staticSheet: true }));
    const byTarget = ModifierUtils.groupByTarget(staticModifiers);

    // For each target, evaluate conditions, resolve stacking and sum
    for (const [target, modsForTarget] of byTarget.entries()) {
      // PHASE 2: Filter modifiers based on conditions
      const applicableModifiers = modsForTarget.filter(mod =>
        ConditionEvaluator.evaluateAll(actor, mod.conditions)
      );

      if (applicableModifiers.length === 0) {
        continue; // No applicable modifiers for this target
      }

      const resolved = ModifierUtils.resolveStacking(applicableModifiers);
      const total = ModifierUtils.sumModifiers(resolved);

      if (total !== 0) {
        aggregated[target] = total;
      }
    }

    if (cacheKey) this._rememberBounded(this._aggregateCache, this._aggregateCacheOrder, cacheKey, aggregated, this._aggregateCacheMax);
    return this._cloneCacheValue(aggregated);
  }

  /**
   * Get aggregated modifier value for specific target
   *
   * PHASE 2: Evaluate conditions before calculating total.
   *
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {number}
   */
  static async aggregateTarget(actor, target, options = {}) {
    const context = options?.context ?? {};
    const hasRuntimeContext = this._hasRuntimeContext(context);
    if (!hasRuntimeContext) {
      const aggregated = await this.aggregateAll(actor);
      return Number(aggregated?.[target] || 0) || 0;
    }

    const baseModifiers = await this.getAllModifiers(actor);
    const contextualModifiers = hasRuntimeContext
      ? this.getEffectIntentModifiersForContext(actor, { context, includeBroad: false })
      : [];
    const allModifiers = [...baseModifiers, ...contextualModifiers];
    // PHASE 2: Filter based on conditions. Contextual roll-time modifiers are
    // evaluated with runtime context; broad sheet modifiers keep static policy.
    const applicableModifiers = allModifiers.filter(mod => {
      const isContextualIntent = mod?.source === ModifierSource.EFFECT && Array.isArray(mod?.conditions) && mod.conditions.some(cond => String(cond || '').includes(':'));
      const allowed = isContextualIntent
        ? this.isModifierAllowedInContext(actor, mod, context, { staticSheet: false })
        : this.isModifierAllowedInContext(actor, mod, {}, { staticSheet: true });
      if (!allowed) return false;
      try {
        return ConditionEvaluator.evaluateAll(actor, mod.conditions, isContextualIntent ? context : undefined);
      } catch (_err) {
        return true;
      }
    });
    return ModifierUtils.calculateModifierTotal(applicableModifiers, target);
  }

  /**
   * Get detailed modifier breakdown for UI display
   *
   * PHASE 2: Evaluate conditions before breakdown.
   *
   * @param {Actor} actor
   * @param {string} target - Target key
   * @returns {Object} {total, applied, breakdown}
   */
  static async getModifierDetail(actor, target) {
    const allModifiers = await this.getAllModifiers(actor);
    // PHASE 2: Filter based on conditions
    const applicableModifiers = allModifiers.filter(mod =>
      this.isModifierAllowedInContext(actor, mod, {}, { staticSheet: true }) &&
      ConditionEvaluator.evaluateAll(actor, mod.conditions)
    );
    return ModifierUtils.getModifierDetail(applicableModifiers, target);
  }

  /**
   * Build canonical modifier breakdown object for storage
   *
   * Structure stored in system.derived.modifiers:
   * {
   *   "skill.acrobatics": { total: 2, applied: [...], breakdown: [...] },
   *   "defense.reflex": { total: 1, applied: [...], breakdown: [...] }
   * }
   *
   * @param {Actor} actor
   * @param {string[]} targets - Targets to include in breakdown
   * @returns {Object}
   */
  static async buildModifierBreakdown(actor, targets = []) {
    const sourceKey = this._actorModifierSourceSignature(actor);
    const targetKey = this._targetsSignature(targets);
    const cacheKey = sourceKey && targetKey ? `${sourceKey}|breakdown|${targetKey}` : null;
    if (cacheKey && this._breakdownCache.has(cacheKey)) {
      return this._cloneCacheValue(this._breakdownCache.get(cacheKey));
    }

    const allModifiers = await this.getAllModifiers(actor);
    const staticModifiers = allModifiers.filter(mod => this.isModifierAllowedInContext(actor, mod, {}, { staticSheet: true }));
    const breakdown = ModifierUtils.buildModifierBreakdown(staticModifiers, targets);
    if (cacheKey) this._rememberBounded(this._breakdownCache, this._breakdownCacheOrder, cacheKey, breakdown, this._breakdownCacheMax);
    return this._cloneCacheValue(breakdown);
  }

  /**
   * ========================================
   * PRIVATE: Modifier Collection Methods
   * ========================================
   */

  /**
   * Collect modifiers from feats
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getFeatModifiers(actor) {
    const modifiers = [];
    const feats = (actor?.items ?? []).filter(i => i.type === 'feat');

    for (const feat of feats) {
      const data = feat.system ?? {};

      // Skip legacy bonuses for PASSIVE execution model (handled by PASSIVE framework)
      if (data.executionModel === 'PASSIVE') {
        continue;
      }

      const featName = feat.name || 'Unknown Feat';
      const featId = feat.id;

      // Parse skill bonuses
      if (data.skillBonuses && typeof data.skillBonuses === 'object') {
        for (const [skillKey, bonusValue] of Object.entries(data.skillBonuses)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.FEAT,
                sourceId: featId,
                sourceName: featName,
                target: `skill.${skillKey}`,
                type: ModifierType.UNTYPED, // Could be inferred from benefit text
                value: bonusValue,
                enabled: true,
                description: `${featName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for feat ${featName} skill ${skillKey}:`, err);
            }
          }
        }
      }

      // Parse defense modifiers
      if (data.defenseModifiers && typeof data.defenseModifiers === 'object') {
        for (const [defense, bonusValue] of Object.entries(data.defenseModifiers)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.FEAT,
                sourceId: featId,
                sourceName: featName,
                target: `defense.${defense}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${featName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for feat ${featName} defense ${defense}:`, err);
            }
          }
        }
      }

      // Parse initiative bonus
      if (typeof data.initiativeBonus === 'number' && data.initiativeBonus !== 0) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.FEAT,
            sourceId: featId,
            sourceName: featName,
            target: 'initiative.total',
            type: ModifierType.UNTYPED,
            value: data.initiativeBonus,
            enabled: true,
            description: `${featName} ${data.initiativeBonus > 0 ? '+' : ''}${data.initiativeBonus}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create modifier for feat ${featName} initiative:`, err);
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from talents
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getTalentModifiers(actor) {
    const modifiers = [];
    const talents = (actor?.items ?? []).filter(i => i.type === 'talent');

    for (const talent of talents) {
      const data = talent.system ?? {};

      // Skip legacy bonuses for PASSIVE execution model (handled by PASSIVE framework)
      if (data.executionModel === 'PASSIVE') {
        continue;
      }

      const talentName = talent.name || 'Unknown Talent';
      const talentId = talent.id;

      // Talents follow same bonus structure as feats
      if (data.skillBonuses && typeof data.skillBonuses === 'object') {
        for (const [skillKey, bonusValue] of Object.entries(data.skillBonuses)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.TALENT,
                sourceId: talentId,
                sourceName: talentName,
                target: `skill.${skillKey}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${talentName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for talent ${talentName}:`, err);
            }
          }
        }
      }

      if (data.defenseModifiers && typeof data.defenseModifiers === 'object') {
        for (const [defense, bonusValue] of Object.entries(data.defenseModifiers)) {
          if (typeof bonusValue === 'number' && bonusValue !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.TALENT,
                sourceId: talentId,
                sourceName: talentName,
                target: `defense.${defense}`,
                type: ModifierType.UNTYPED,
                value: bonusValue,
                enabled: true,
                description: `${talentName} +${bonusValue}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for talent ${talentName} defense:`, err);
            }
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from species
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getSpeciesModifiers(actor) {
    const modifiers = [];

    // Species stored in actor.system.species (string or object)
    const species = actor?.system?.species;
    if (!species) return modifiers;

    const speciesName = typeof species === 'string' ? species : species?.name || species?.value || 'Unknown Species';
    const speciesId = `species.${speciesName}`;

    // Parse species data
    const speciesData = typeof species === 'object' ? species : {};

    // Phase 1: Evaluate structured rule elements from species traits (NEW)
    try {
      const allTraits = [
        ...(speciesData.structuralTraits || []),
        ...(speciesData.conditionalTraits || []),
        ...(speciesData.bonusFeats || [])
      ];

      const structuredModifiers = StructuredRuleEvaluator.evaluateSpeciesRules(
        actor,
        allTraits,
        speciesName
      );

      modifiers.push(...structuredModifiers);
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error evaluating structured species rules:`, err);
    }

    // Phase 2: Legacy skill bonuses (DEPRECATED - for backwards compatibility)
    if (speciesData.skillBonuses && typeof speciesData.skillBonuses === 'object') {
      for (const [skillKey, bonusValue] of Object.entries(speciesData.skillBonuses)) {
        if (typeof bonusValue === 'number' && bonusValue !== 0) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.SPECIES,
              sourceId: speciesId,
              sourceName: `${speciesName} (Species)`,
              target: `skill.${skillKey}`,
              type: ModifierType.UNTYPED,
              value: bonusValue,
              enabled: true,
              description: `${speciesName} species +${bonusValue}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create species skill modifier for ${speciesName}:`, err);
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Collect modifiers from background state (Phase 4)
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getBackgroundModifiers(actor) {
    const modifiers = [];

    try {
      // PHASE 4: Consume canonical background state from Phase 3 materialization
      // Occupation backgrounds grant +2 competence bonus to untrained checks with relevant skills
      const occupationBonuses = actor.flags?.swse?.occupationUntrainedBonuses || [];

      for (const bonus of occupationBonuses) {
        if (!bonus || typeof bonus.value !== 'number' || !Array.isArray(bonus.applicableSkills)) {
          continue;
        }

        const backgroundId = `background.occupation`;
        const backgroundName = actor.system?.profession || 'Occupation';

        // Create a modifier for EACH applicable skill
        // Type: competence (+2 to untrained checks)
        for (const skillKey of bonus.applicableSkills) {
          try {
            // Key: "skill.skillName.untrained_competence"
            // This allows skill calculators to specifically apply only to untrained checks
            const modifierTarget = `skill.${skillKey}.untrained_competence`;

            modifiers.push(createModifier({
              source: ModifierSource.BACKGROUND,
              sourceId: backgroundId,
              sourceName: `${backgroundName} (Occupation)`,
              target: modifierTarget,
              type: ModifierType.COMPETENCE,
              value: bonus.value,
              enabled: true,
              description: `${backgroundName} occupation: +2 competence to untrained checks with ${skillKey}`,
              conditions: [
                {
                  type: 'untrained_check',
                  skillKey: skillKey
                }
              ]
            }));
          } catch (err) {
            swseLogger.warn(`[ModifierEngine] Failed to create occupation bonus for ${skillKey}:`, err);
          }
        }
      }

      // PHASE 4: Collect any other background bonuses (generic bonus structure)
      const backgroundBonuses = actor.flags?.swse?.backgroundBonuses || {};

      // Process untrained bonuses
      const untrainedBonuses = backgroundBonuses.untrained || [];
      for (const bonus of untrainedBonuses) {
        if (!bonus || typeof bonus.value !== 'number' || !Array.isArray(bonus.applicableSkills)) {
          continue;
        }

        for (const skillKey of bonus.applicableSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.BACKGROUND,
              sourceId: `background.bonus.untrained.${skillKey}`,
              sourceName: 'Background Bonus',
              target: `skill.${skillKey}`,
              type: ModifierType.UNTYPED,
              value: bonus.value,
              enabled: true,
              description: `Background untrained bonus: +${bonus.value} to ${skillKey}`
            }));
          } catch (err) {
            swseLogger.warn(`[ModifierEngine] Failed to create background untrained bonus:`, err);
          }
        }
      }

      // Process flat bonuses
      const flatBonuses = backgroundBonuses.flat || [];
      for (const bonus of flatBonuses) {
        if (!bonus || typeof bonus.value !== 'number' || !Array.isArray(bonus.applicableSkills)) {
          continue;
        }

        for (const skillKey of bonus.applicableSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.BACKGROUND,
              sourceId: `background.bonus.flat.${skillKey}`,
              sourceName: 'Background Bonus',
              target: `skill.${skillKey}`,
              type: ModifierType.UNTYPED,
              value: bonus.value,
              enabled: true,
              description: `Background flat bonus: +${bonus.value} to ${skillKey}`
            }));
          } catch (err) {
            swseLogger.warn(`[ModifierEngine] Failed to create background flat bonus:`, err);
          }
        }
      }
    } catch (err) {
      swseLogger.error(`[ModifierEngine] Error collecting background modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from encumbrance state
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getEncumbranceModifiers(actor) {
    const modifiers = [];

    try {
      const encState = EncumbranceEngine.calculateEncumbrance(actor);

      // Only apply modifiers for heavy load or overloaded states
      if (!encState || (encState.state !== 'heavy' && encState.state !== 'overloaded')) {
        return modifiers;
      }

      // Encumbrance penalty applies to specific skills
      if (encState.skillPenalty !== 0 && Array.isArray(encState.affectedSkills)) {
        const affectedSkills = encState.affectedSkills;
        const penaltyValue = encState.skillPenalty;

        for (const skillKey of affectedSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ENCUMBRANCE,
              sourceId: `encumbrance.${encState.state}`,
              sourceName: `Encumbrance (${encState.label})`,
              target: `skill.${skillKey}`,
              type: ModifierType.PENALTY,
              value: penaltyValue,
              enabled: true,
              priority: 10, // Encumbrance penalties apply early
              description: `${encState.label} ${penaltyValue}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create encumbrance modifier for skill ${skillKey}:`, err);
          }
        }
      }

      // Speed penalty (if applicable)
      if (encState.speedMultiplier !== 1) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ENCUMBRANCE,
            sourceId: `encumbrance.${encState.state}`,
            sourceName: `Encumbrance (${encState.label})`,
            target: 'speed.base',
            type: ModifierType.PENALTY,
            value: Math.round((encState.speedMultiplier - 1) * 100), // As percentage
            enabled: true,
            priority: 10,
            description: `${encState.label} speed`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create encumbrance speed modifier:`, err);
        }
      }

      // Meta-modifier for dexterity loss (special handling in DefenseCalculator)
      if (encState.removeDexToReflex === true) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ENCUMBRANCE,
            sourceId: `encumbrance.${encState.state}`,
            sourceName: `Encumbrance (${encState.label})`,
            target: 'defense.reflex',
            type: ModifierType.DEXTERITY_LOSS,
            value: 0, // Meta-modifier, no numeric value
            enabled: true,
            priority: 5,
            description: 'DEX bonus lost due to encumbrance'
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create encumbrance dexterity loss modifier:`, err);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting encumbrance modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from condition track
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getConditionModifiers(actor) {
    const modifiers = [];

    try {
      const ct = actor?.system?.conditionTrack;
      if (!ct) return modifiers;

      const step = Number(ct.current ?? 0);
      if (step <= 0 || step >= 5) {
        // Step 0 (normal) or 5+ (helpless) don't apply numeric penalties
        return modifiers;
      }

      // Define condition penalties per step (SWSE rules)
      const conditionPenalties = {
        1: -1,   // Step 1: -1 penalty
        2: -2,   // Step 2: -2 penalty
        3: -5,   // Step 3: -5 penalty
        4: -10   // Step 4: -10 penalty
      };

      const penalty = conditionPenalties[step] || 0;
      if (penalty === 0) return modifiers;

      const conditionLabel = `Condition Track (Step ${step})`;

      // NOTE: Condition penalties for skills are now pre-computed in DerivedCalculator
      // and included in system.derived.skills[skillKey].total, so we do NOT apply them
      // here to avoid double-counting. ModifierEngine only applies situational/temporary mods.

      // Apply to defenses
      for (const defense of ['defense.fortitude', 'defense.reflex', 'defense.will']) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.CONDITION,
            sourceId: `condition.step${step}`,
            sourceName: conditionLabel,
            target: defense,
            type: ModifierType.PENALTY,
            value: penalty,
            enabled: true,
            priority: 20,
            description: conditionLabel
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create condition modifier for ${defense}:`, err);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting condition modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from items (equipment, armor, etc.)
   *
   * PHASE 1 IMPLEMENTATION: Armor Modifier Registration
   * This function registers all armor effects as structured modifiers:
   * - Defense bonuses (reflex, fort)
   * - Armor check penalties (to affected skills)
   * - Speed penalties
   * - Max dex bonus enforcement
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getItemModifiers(actor) {
    const modifiers = [];

    if (!actor) return modifiers;

    try {
      // Find equipped body armor. Energy shields are armor-backed items, but they
      // contribute SR/activation state rather than armor Reflex/Fortitude bonuses.
      const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system?.equipped && !isEnergyShieldItem(i));

      if (!equippedArmor) {
        return modifiers; // No armor equipped
      }

      const armorSystem = equippedArmor.system;
      const armorStats = resolveArmorData(equippedArmor);
      const armorName = equippedArmor.name || 'Unknown Armor';
      const armorId = equippedArmor.id;
      const armorType = armorStats.armorType || 'light';

      // ===== ARMOR PROFICIENCY CHECK =====
      // Proficiency can come from stored actor system flags, progression unlock
      // grants, or feat/talent items.  This must use the same armor coverage
      // ladder as defenses: Heavy covers all, Medium covers Medium/Light, Light
      // covers Light.  Proficiency does not erase base armor check penalty; it
      // only prevents the extra non-proficiency penalty.
      const isProficient = actorHasArmorProficiencyForArmor(actor, equippedArmor);

      // ===== TALENT CHECKS =====
      // Talent flags are preferred, but owned talent items remain the SSOT for
      // actors that have not been reconciled through the v2 progression engine.
      const talentFlags = actor?.system?.talentFlags || {};
      const hasNamedTalent = (name) => Array.from(actor?.items ?? []).some(item =>
        item?.type === 'talent' && String(item?.name || '').trim().toLowerCase() === String(name).toLowerCase()
      );
      const hasArmorSpecialistArmorMasteryItem = Array.from(actor?.items ?? []).some(item => {
        if (item?.type !== 'talent' || String(item?.name || '').trim().toLowerCase() !== 'armor mastery') return false;
        const text = [item.system?.treeId, item.system?.tree, item.system?.description?.value ?? item.system?.description, item.system?.benefit]
          .filter(Boolean).join(' ').toLowerCase();
        return text.includes('17cec542331cb4e4') || text.includes('armor-specialist') || text.includes('maximum dexterity') || text.includes('max dex');
      });
      let hasArmoredDefense = isProficient && (talentFlags.armoredDefense === true || hasNamedTalent('Armored Defense'));
      let hasImprovedArmoredDefense = isProficient && (talentFlags.improvedArmoredDefense === true || hasNamedTalent('Improved Armored Defense'));
      let hasArmorMastery = isProficient && (talentFlags.armorMastery === true || hasArmorSpecialistArmorMasteryItem);
      const hasSecondSkin = isProficient && hasNamedTalent('Second Skin');
      const hasJuggernaut = isProficient && hasNamedTalent('Juggernaut');

      // ===== DEFENSE CONTRIBUTION =====
      // DefenseCalculator is the single source of truth for armor Reflex/Fortitude
      // math, including Armored Defense, Improved Armored Defense, Second Skin,
      // proficiency, and max-Dex clamping.  Do not also emit base armor defense
      // modifiers here: DerivedCalculator aggregates ModifierEngine defense
      // adjustments and passes them into DefenseCalculator, so registering armor
      // here double-counts armor and makes equipped characters too high.
      const baseArmorBonus = (armorStats.reflexBonus || 0) + (hasSecondSkin ? 1 : 0);
      void baseArmorBonus;

      // ===== MAX DEX BONUS ENFORCEMENT =====
      let maxDex = armorStats.maxDexBonus ?? null;
      if (Number.isInteger(maxDex)) {
        // Armor Mastery increases max dex by +1
        if (hasArmorMastery) {
          maxDex += 1;
        }

        // Register as a modifier to the defense.dexLimit target
        // This will be consumed by DefenseCalculator to clamp dex modifier
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: armorId,
            sourceName: `${armorName} (Max Dex Limit)`,
            target: 'defense.dexLimit',
            type: ModifierType.RESTRICTION,
            value: maxDex, // Positive number = cap on dex bonus
            enabled: true,
            priority: 50, // Early priority
            description: `${armorName} restricts max Dex bonus to +${maxDex}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create armor max dex modifier:`, err);
        }
      }

      // ===== ARMOR CHECK PENALTY (Skills) =====
      let acpValue = armorStats.armorCheckPenalty || 0;
      if (!isProficient) {
        // Apply proficiency penalty if not proficient
        const proficiencyPenalty = getArmorProficiencyPenalty(armorType);
        acpValue = acpValue + proficiencyPenalty; // Combine with armor's base penalty
      }

      // Apply ACP to SWSE affected skills.
      // Proficiency does not remove the armor's base ACP; it only prevents the
      // extra non-proficiency penalty above.
      if (acpValue !== 0) {
        const acpSkills = [
          'acrobatics', 'climb', 'endurance', 'initiative', 'jump', 'stealth', 'swim', 'athletics'
        ];

        for (const skillKey of acpSkills) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: armorId,
              sourceName: `${armorName} (ACP)`,
              target: `skill.${skillKey}`,
              type: ModifierType.PENALTY,
              value: acpValue, // Negative value
              enabled: true,
              priority: 25, // After other skill modifiers
              description: `${armorName} applies ${acpValue} armor check penalty to ${skillKey}`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create armor ACP modifier for skill.${skillKey}:`, err);
          }
        }
      }

      // ===== SPEED PENALTY =====
      let speedPenalty = armorSystem.speedPenalty || 0;
      // Apply SWSE standard speed penalties if not specified
      if (speedPenalty === 0) {
        const baseSpeed = actor.system?.derivedSpeed?.base || actor.system?.speed || 6;
        if (baseSpeed >= 6) {
          if (armorType === 'medium') {
            speedPenalty = -2;
          } else if (armorType === 'heavy') {
            speedPenalty = -4;
          }
        }
      } else {
        // Negate the penalty for modifier (which adds to speed)
        speedPenalty = -speedPenalty;
      }

      if (hasJuggernaut) {
        speedPenalty = 0;
      }

      if (speedPenalty !== 0) {
        try {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: armorId,
            sourceName: `${armorName} (Speed Penalty)`,
            target: 'speed.base',
            type: ModifierType.PENALTY,
            value: speedPenalty, // Negative value
            enabled: true,
            priority: 30,
            description: `${armorName} reduces speed by ${Math.abs(speedPenalty)} squares`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create armor speed modifier:`, err);
        }
      }

      // ===== LEGACY REFLEX EQUIPMENT BONUS (deprecated ambiguous field) =====
      // Also handled by resolveArmorData() and DefenseCalculator.  Keeping it in
      // ModifierEngine would double-count legacy armor records.

      // ===== PHASE 5: ARMOR UPGRADE MODIFIERS =====
      // Register modifiers from installed upgrades on the armor
      const installedUpgrades = armorSystem.installedUpgrades || [];
      if (Array.isArray(installedUpgrades) && installedUpgrades.length > 0) {
        for (const upgrade of installedUpgrades) {
          if (!upgrade || typeof upgrade !== 'object') continue;

          const upgradeName = upgrade.name || `Upgrade ${upgrade.id}`;
          const upgradeId = upgrade.id;

          // Armor upgrades can modify:
          // - defense.reflex (additional armor bonus)
          // - defense.fort (additional equipment bonus)
          // - skill.* (modify armor check penalty)
          // - speed.base (modify speed penalty)

          // Example upgrade data structure:
          // {
          //   name: "Reinforced Plating",
          //   modifiers: {
          //     reflexBonus: 1,       // +1 reflex defense
          //     fortBonus: 0,         // +0 fort defense
          //     acpModifier: 0,       // no ACP change
          //     speedModifier: 0      // no speed change
          //   }
          // }

          const upgradeModifiers = upgrade.modifiers || {};

          // Reflex bonus from upgrade
          if (typeof upgradeModifiers.reflexBonus === 'number' && upgradeModifiers.reflexBonus !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Reflex Bonus)`,
                target: 'defense.reflex',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.reflexBonus,
                enabled: true,
                priority: 35, // After base armor bonus
                description: `${upgradeName} provides +${upgradeModifiers.reflexBonus} reflex defense`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade reflex modifier for ${upgradeName}:`, err);
            }
          }

          // Fortitude bonus from upgrade
          if (typeof upgradeModifiers.fortBonus === 'number' && upgradeModifiers.fortBonus !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Fort Bonus)`,
                target: 'defense.fortitude',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.fortBonus,
                enabled: true,
                priority: 35,
                description: `${upgradeName} provides +${upgradeModifiers.fortBonus} fortitude defense`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade fort modifier for ${upgradeName}:`, err);
            }
          }

          // ACP modifier from upgrade (affects all ACP-affected skills)
          if (typeof upgradeModifiers.acpModifier === 'number' && upgradeModifiers.acpModifier !== 0) {
            const acpSkills = [
              'acrobatics', 'climb', 'escapeArtist', 'jump', 'sleightOfHand', 'stealth', 'swim', 'useRope'
            ];

            for (const skillKey of acpSkills) {
              try {
                modifiers.push(createModifier({
                  source: ModifierSource.ITEM,
                  sourceId: upgradeId,
                  sourceName: `${upgradeName} (ACP Mod)`,
                  target: `skill.${skillKey}`,
                  type: ModifierType.ENHANCEMENT,
                  value: upgradeModifiers.acpModifier,
                  enabled: true,
                  priority: 35,
                  description: `${upgradeName} modifies armor check penalty by ${upgradeModifiers.acpModifier > 0 ? '+' : ''}${upgradeModifiers.acpModifier}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create upgrade ACP modifier for skill.${skillKey}:`, err);
              }
            }
          }

          // Speed modifier from upgrade
          if (typeof upgradeModifiers.speedModifier === 'number' && upgradeModifiers.speedModifier !== 0) {
            try {
              modifiers.push(createModifier({
                source: ModifierSource.ITEM,
                sourceId: upgradeId,
                sourceName: `${upgradeName} (Speed Mod)`,
                target: 'speed.base',
                type: ModifierType.ENHANCEMENT,
                value: upgradeModifiers.speedModifier,
                enabled: true,
                priority: 35,
                description: `${upgradeName} modifies speed by ${upgradeModifiers.speedModifier > 0 ? '+' : ''}${upgradeModifiers.speedModifier}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create upgrade speed modifier for ${upgradeName}:`, err);
            }
          }
        }
      }

      swseLogger.debug(`[ModifierEngine] Registered ${modifiers.length} armor modifiers for ${armorName} (${armorType}, proficient: ${isProficient})`);

    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting armor item modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Collect weapon modifiers from equipped weapons
   * Replaces direct weapon calculations in combat-utils.js
   * Integrates WeaponsEngine to register weapon effects as modifiers:
   * - Enhancement bonuses
   * - Proficiency penalties
   * - Two-handed bonuses
   * - Talent-based damage bonuses
   * - Weapon properties (keen, flaming, etc.)
   *
   * @private
   * @param {Actor} actor - Actor with equipped weapons
   * @returns {Modifier[]}
   */
  static _getWeaponModifiers(actor) {
    const modifiers = [];

    try {
      if (!actor) {
        return modifiers;
      }

      // Get all weapon modifiers through WeaponsEngine
      const weaponMods = WeaponsEngine.getWeaponModifiers(actor);
      modifiers.push(...weaponMods);

      swseLogger.debug(`[ModifierEngine] Collected ${weaponMods.length} weapon modifiers for ${actor.name}`);
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting weapon modifiers for ${actor?.name}:`, err);
    }

    return modifiers;
  }

  /**
   * Collect modifiers from droid modifications (Phase A)
   * Droids can install hardware modifications that contribute modifiers
   *
   * @private
   * @param {Actor} actor - Must be a droid actor
   * @returns {Modifier[]}
   */
  static async _getDroidModModifiers(actor) {
    const modifiers = [];

    if (actor.type !== 'droid') {
      return modifiers;
    }

    try {
      // PHASE 4 STEP 7: Support both legacy (droidSystems.mods) and new (installedSystems) structures
      const droidSystems = actor?.system?.droidSystems;
      const installedSystems = actor?.system?.installedSystems;

      // Legacy path: droidSystems.mods (builder system)
      if (droidSystems) {
        const mods = Array.isArray(droidSystems.mods) ? droidSystems.mods : [];

        for (const mod of mods) {
          // Skip disabled modifications
          if (mod.enabled === false) {
            continue;
          }

          const modName = mod.name || `Droid Mod ${mod.id}`;
          const modId = mod.id;
          const modArray = Array.isArray(mod.modifiers) ? mod.modifiers : [];

          // Convert each modifier in the modification
          for (const modifierData of modArray) {
            if (!modifierData || typeof modifierData !== 'object') continue;

            const target = String(modifierData.target || '').trim();
            const type = String(modifierData.type || 'untyped').trim().toLowerCase();
            const value = Number(modifierData.value) || 0;

            if (!target) continue;

            try {
              modifiers.push(createModifier({
                source: ModifierSource.DROID_MOD,
                sourceId: modId,
                sourceName: modName,
                target: target,
                type: type,
                value: value,
                enabled: true,
                description: `${modName}: ${target} ${value > 0 ? '+' : ''}${value}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for droid mod ${modName}:`, err);
            }
          }
        }
      }

      // PHASE 4 STEP 7: New path - installedSystems from DROID_SYSTEM_DEFINITIONS
      if (installedSystems && typeof installedSystems === 'object') {
        try {
          const { DROID_SYSTEM_DEFINITIONS, getDroidSystemDefinition } = await import("/systems/foundryvtt-swse/scripts/domain/droids/droid-system-definitions.js");

          for (const [systemId, installed] of Object.entries(installedSystems)) {
            const def = getDroidSystemDefinition(systemId);
            if (!def) {
              continue; // System definition not found
            }

            const systemName = def.name || systemId;
            const effects = Array.isArray(def.effects) ? def.effects : [];

            // Convert system effects into modifiers
            for (const effect of effects) {
              if (!effect || typeof effect !== 'object') continue;

              const target = String(effect.target || '').trim();
              const type = String(effect.type || 'untyped').trim().toLowerCase();
              const value = Number(effect.value) || 0;

              if (!target) continue;

              try {
                modifiers.push(createModifier({
                  source: ModifierSource.DROID_MOD,
                  sourceId: systemId,
                  sourceName: systemName,
                  target: target,
                  type: type,
                  value: value,
                  enabled: true,
                  description: `${systemName}: ${target} ${value > 0 ? '+' : ''}${value}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create modifier for system ${systemName}:`, err);
              }
            }
          }
        } catch (err) {
          swseLogger.warn(`[ModifierEngine] Error processing installed droid systems:`, err);
        }
      }

      // Droid sheet v2/Garage-installed items can be plain actor Items with droid part
      // metadata rather than entries in system.droidSystems.mods. Hydrate them through the
      // shared part schema so skill/defense/HP bonuses are applied by the normal modifier
      // pipeline instead of duplicated in sheet code.
      try {
        const { hydrateDroidPart, normalizeDroidPartId } = await import("/systems/foundryvtt-swse/scripts/data/droid-part-schema.js");
        const itemList = typeof actor.items?.contents !== 'undefined' ? actor.items.contents : Array.from(actor.items ?? []);
        const installedIds = itemList.map(item => normalizeDroidPartId(item?.system?.droidPartId || item?.flags?.swse?.droidPartId || item?.name));
        const canonicalTarget = (target) => {
          const raw = String(target || '').trim();
          if (!raw) return '';
          if (raw.startsWith('skill.')) {
            const [, skill] = raw.split('.');
            return skill ? `skill.${skill}` : '';
          }
          if (raw === 'defense.damageThreshold') return raw;
          if (raw.startsWith('defense.')) return raw;
          if (raw === 'hp.max') return raw;
          if (raw.startsWith('speed.')) return raw;
          if (raw === 'initiative.total') return raw;
          if (raw === 'bab.total') return raw;
          return '';
        };
        const canonicalType = (type) => {
          const key = String(type || '').toLowerCase();
          if (['competence', 'enhancement', 'morale', 'insight', 'circumstance', 'penalty', 'dodge'].includes(key)) return key;
          return ModifierType.UNTYPED;
        };

        for (const item of itemList) {
          const hydrated = hydrateDroidPart(item, { installedIds });
          const modArray = Array.isArray(hydrated.modifiers) ? hydrated.modifiers : [];
          for (const modifierData of modArray) {
            if (!modifierData || modifierData.active === false) continue;
            const target = canonicalTarget(modifierData.target);
            const value = Number(modifierData.value) || 0;
            if (!target || value === 0) continue;
            try {
              modifiers.push(createModifier({
                source: ModifierSource.DROID_MOD,
                sourceId: `${item.id ?? hydrated.ruleId}:${target}`,
                sourceName: hydrated.name || item.name || 'Droid System',
                target,
                type: canonicalType(modifierData.type),
                value,
                enabled: true,
                description: `${hydrated.name || item.name}: ${target} ${value > 0 ? '+' : ''}${value}`
              }));
            } catch (err) {
              swseLogger.warn(`Failed to create modifier for droid part ${hydrated.name}:`, err);
            }
          }
        }
      } catch (err) {
        swseLogger.warn(`[ModifierEngine] Error hydrating droid item modifiers:`, err);
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers from droid modifications`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting droid mod modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from vehicle systems (Phase 6)
   * Vehicles can install modifications that contribute modifiers
   *
   * @private
   * @param {Actor} actor - Must be a vehicle actor
   * @returns {Modifier[]}
   */
  static async _getVehicleModModifiers(actor) {
    const modifiers = [];

    if (actor.type !== 'vehicle') {
      return modifiers;
    }

    try {
      const installedSystems = actor?.system?.installedSystems;

      if (installedSystems && typeof installedSystems === 'object') {
        try {
          const { VEHICLE_SYSTEM_DEFINITIONS, getVehicleSystemDefinition } = await import("/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-system-definitions.js");

          for (const [systemId, installed] of Object.entries(installedSystems)) {
            const def = getVehicleSystemDefinition(systemId);
            if (!def) {
              continue;
            }

            const systemName = def.name || systemId;
            const effects = Array.isArray(def.effects) ? def.effects : [];

            for (const effect of effects) {
              if (!effect || typeof effect !== 'object') continue;

              const target = String(effect.target || '').trim();
              const type = String(effect.type || 'untyped').trim().toLowerCase();
              const value = Number(effect.value) || 0;

              if (!target) continue;

              try {
                modifiers.push(createModifier({
                  source: ModifierSource.VEHICLE_MOD,
                  sourceId: systemId,
                  sourceName: systemName,
                  target: target,
                  type: type,
                  value: value,
                  enabled: true,
                  description: `${systemName}: ${target} ${value > 0 ? '+' : ''}${value}`
                }));
              } catch (err) {
                swseLogger.warn(`Failed to create modifier for vehicle system ${systemName}:`, err);
              }
            }
          }
        } catch (err) {
          swseLogger.warn(`[ModifierEngine] Error processing vehicle systems:`, err);
        }
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} modifiers from vehicle modifications`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting vehicle mod modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from custom sources (Phase B - UI-managed)
   * Stored in actor.system.customModifiers array
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getCustomModifiers(actor) {
    const modifiers = [];

    try {
      const customMods = Array.isArray(actor?.system?.customModifiers) ? actor.system.customModifiers : [];

      for (const customMod of customMods) {
        // Skip disabled custom modifiers
        if (customMod.enabled === false) {
          continue;
        }

        if (!customMod || typeof customMod !== 'object') continue;

        const customName = customMod.sourceName || customMod.name || 'Custom Modifier';
        const customId = customMod.id;
        const target = String(customMod.target || '').trim();
        const type = String(customMod.type || 'untyped').trim().toLowerCase();
        const value = Number(customMod.value) || 0;

        if (!target) continue;

        try {
          modifiers.push(createModifier({
            source: ModifierSource.CUSTOM,
            sourceId: customId || `custom_${customName}`,
            sourceName: customName,
            target: target,
            type: type,
            value: value,
            enabled: true,
            description: `${customName}: ${target} ${value > 0 ? '+' : ''}${value}`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create custom modifier ${customName}:`, err);
        }
      }

      swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} custom modifiers`);
      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting custom modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from PASSIVE execution model abilities (Phase 1)
   *
   * PASSIVE MODIFIER abilities register themselves in actor._passiveModifiers
   * during PassiveAdapter.handleModifier() execution.
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getPassiveModifiers(actor) {
    const modifiers = [];

    try {
      // PHASE 4: Wire into actor preparation
      // PASSIVE modifiers are stored on actor during registration
      const passiveModifiers = actor?._passiveModifiers || {};

      for (const abilityId in passiveModifiers) {
        const mods = passiveModifiers[abilityId];
        if (Array.isArray(mods)) {
          modifiers.push(...mods);
        }
      }

      if (modifiers.length > 0) {
        swseLogger.debug(`[ModifierEngine] Collected ${modifiers.length} PASSIVE modifiers`);
      }

      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting PASSIVE modifiers:`, err);
      return modifiers;
    }
  }

  /**
   * Collect modifiers from active effects (Phase D)
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getActiveEffectModifiers(actor) {
    const modifiers = [];

    try {
      const effects = Array.isArray(actor?.system?.activeEffects) ? actor.system.activeEffects : [];

      for (const effect of effects) {
        if (effect.enabled === false || !effect.target) continue;

        try {
          modifiers.push(createModifier({
            source: ModifierSource.EFFECT,
            sourceId: effect.id,
            sourceName: `${effect.name} (${effect.roundsRemaining}r)`,
            target: effect.target,
            type: String(effect.type || 'untyped').toLowerCase(),
            value: Number(effect.value) || 0,
            enabled: true,
            description: `${effect.name}: ${effect.roundsRemaining} rounds`
          }));
        } catch (err) {
          swseLogger.warn(`Failed to create active effect modifier:`, err);
        }
      }

      return modifiers;
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting active effects:`, err);
      return modifiers;
    }
  }


  /**
   * Collect modifiers from SWSE Basic Active Effect intents.
   *
   * The entity dialog stores Basic effects as plain-English intent flags on real
   * Foundry ActiveEffects. This call-site is the bridge from that player-facing
   * authoring model into the canonical ModifierEngine pipeline. Advanced raw
   * ActiveEffect changes remain preserved for power users, but Basic effects do
   * not require users to know internal system paths.
   *
   * @private
   * @param {Actor} actor
   * @returns {Modifier[]}
   */
  static _getEffectIntentModifiers(actor) {
    const modifiers = [];
    if (!actor) return modifiers;

    const collectFromEffect = (effect, item = null) => {
      try {
        if (!EffectIntentEngine.hasIntent(effect)) return;
        const modifierData = EffectIntentEngine.toModifierData(effect, { actor, item });
        if (!modifierData) return;
        modifiers.push(createModifier({
          source: ModifierSource.EFFECT,
          ...modifierData
        }));
      } catch (err) {
        swseLogger.warn(`[ModifierEngine] Failed to collect SWSE effect intent modifier`, err);
      }
    };

    try {
      for (const effect of Array.from(actor?.effects ?? [])) {
        const origin = String(effect?.origin ?? effect?.sourceName ?? '');
        // Transferred item effects can appear on actor.effects in some Foundry
        // builds. Item-originated SWSE intents are collected from the owned
        // item below so they can evaluate equipped/activated state without
        // double-counting. Actor-authored effects still collect here.
        if (/\bItem\b/.test(origin)) continue;
        collectFromEffect(effect, null);
      }

      for (const item of Array.from(actor?.items ?? [])) {
        for (const effect of Array.from(item?.effects ?? [])) {
          collectFromEffect(effect, item);
        }
      }
    } catch (err) {
      swseLogger.warn(`[ModifierEngine] Error collecting SWSE effect intent modifiers:`, err);
    }

    return modifiers;
  }

  /**
   * Get all skill target keys for an actor
   * @private
   * @param {Actor} actor
   * @returns {string[]}
   */
  static _getAllSkillTargets(actor) {
    const skills = actor?.system?.skills;
    if (!skills || typeof skills !== 'object') return [];

    return Object.keys(skills)
      .filter(key => skills[key] && typeof skills[key] === 'object')
      .map(key => `skill.${key}`);
  }
}

export default ModifierEngine;
