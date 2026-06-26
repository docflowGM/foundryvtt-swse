/**
 * Lightsaber Construction Engine
 * Pure orchestration layer for lightsaber construction.
 *
 * Responsibilities:
 * - Query available chassis and upgrades
 * - Validate compatibility
 * - Calculate DC and cost
 * - Execute construction roll
 * - Create final item with metadata (atomic mutation only on success)
 *
 * Zero UI logic. Zero chat rendering. Zero modifier logic.
 * All mutations routed through ActorEngine.
 * Deterministic and testable.
 */

import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { getHeroicLevel, getClassLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

export class LightsaberConstructionEngine {
  static _catalogCache = null;
  /**
   * Get all available construction options for an actor
   * Returns chassis, crystals, and accessories the actor could potentially select
   *
   * No eligibility checks. No slot enforcement. Pure query.
   *
   * @param {Actor} actor - The actor attempting construction
   * @returns {Object} { chassis: [], crystals: [], accessories: [] }
   */
  static getConstructionOptions(actor) {
    if (!actor) {
      return { chassis: [], crystals: [], accessories: [] };
    }

    try {
      const items = actor.items || [];
      const chassis = items.filter(i => this.isLightsaberItem(i)).map(i => this.#summarizeOption(i));
      const crystals = items.filter(i => i.type === "weaponUpgrade" && i.system?.lightsaber?.category === "crystal").map(i => this.#summarizeOption(i));
      const accessories = items.filter(i => i.type === "weaponUpgrade" && i.system?.lightsaber?.category === "accessory").map(i => this.#summarizeOption(i));
      return { chassis, crystals, accessories };
    } catch (err) {
      SWSELogger.error("getConstructionOptions failed:", err);
      return { chassis: [], crystals: [], accessories: [] };
    }
  }

  static #getDefaultKyberCrystalOption() {
    return {
      id: 'lightsaber-crystal-standard-kyber',
      _id: 'lightsaber-crystal-standard-kyber',
      name: 'Standard Kyber Crystal',
      img: 'assets/ui/customization/kyber-crystal-outline.svg',
      type: 'weaponUpgrade',
      system: {
        cost: 0,
        weight: 0,
        upgradeSlots: 1,
        rarity: 'common',
        category: 'crystal',
        lightsaber: {
          category: 'crystal',
          crystalType: 'kyber',
          family: 'kyber',
          buildDcModifier: 0,
          compatibleChassis: ['standard', 'double', 'short', 'great', 'pike', 'shoto', 'crossguard', 'dual-phase', 'dueling', 'lightwhip', 'longhandle'],
          bladeColor: 'Varies'
        },
        description: '<p>A standard attuned Kyber crystal. Its blade color is chosen by the builder and has no additional mechanical modifier.</p>',
        modifiers: []
      },
      flags: { swse: { virtualBaseline: true }, 'foundryvtt-swse': { virtualBaseline: true } },
      description: '<p>A standard attuned Kyber crystal. Its blade color is chosen by the builder and has no additional mechanical modifier.</p>',
      rarity: 'common',
      buildDcModifier: 0,
      cost: 0,
      compatibleChassis: ['standard', 'double', 'short', 'great', 'pike', 'shoto', 'crossguard', 'dual-phase', 'dueling', 'lightwhip', 'longhandle'],
      bladeColor: 'Varies'
    };
  }

  static #withDefaultKyberCrystal(crystals = []) {
    const summarized = crystals
      .filter(i => i.type === 'weaponUpgrade' && i.system?.lightsaber?.category === 'crystal')
      .map(i => this.#summarizeOption(i));
    const hasBaselineKyber = summarized.some(option => {
      const text = [
        option.id,
        option._id,
        option.name,
        option.system?.lightsaber?.crystalType,
        option.system?.lightsaber?.family
      ].filter(Boolean).join(' ').toLowerCase();
      const hasNoMechanicalPayload = !(Array.isArray(option.system?.modifiers) && option.system.modifiers.length)
        && Number(option.system?.lightsaber?.buildDcModifier ?? option.buildDcModifier ?? 0) === 0;
      return hasNoMechanicalPayload && /\b(standard[- ]?)?kyber\b|\bdefault[- ]?crystal\b/.test(text);
    });
    return hasBaselineKyber ? summarized : [this.#getDefaultKyberCrystalOption(), ...summarized];
  }

  static async getCatalogOptions() {
    if (this._catalogCache) return this._catalogCache;
    const getDocs = async (packId, fallback = []) => {
      try {
        const pack = game?.packs?.get(packId);
        if (!pack) return fallback;
        const docs = await pack.getDocuments();
        return docs || fallback;
      } catch (err) {
        SWSELogger.error(`getCatalogOptions failed for ${packId}:`, err);
        return fallback;
      }
    };

    const [chassis, crystals, accessories] = await Promise.all([
      getDocs('foundryvtt-swse.weapons-lightsabers'),
      getDocs('foundryvtt-swse.lightsaber-crystals'),
      getDocs('foundryvtt-swse.lightsaber-accessories')
    ]);

    const dedupeByName = (arr) => {
      const seen = new Set();
      return arr.filter(i => {
        const key = (i.name ?? '').toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    this._catalogCache = {
      chassis: dedupeByName(chassis.filter(i => this.isLightsaberItem(i) && i.system?.constructible === true)).map(i => this.#summarizeOption(i)),
      crystals: this.#withDefaultKyberCrystal(dedupeByName(crystals)),
      accessories: dedupeByName(accessories.filter(i => i.type === 'weaponUpgrade' && i.system?.lightsaber?.category === 'accessory')).map(i => this.#summarizeOption(i))
    };
    return this._catalogCache;
  }

  static isLightsaberItem(item) {
    if (!item) return false;
    const system = item.system || {};
    if (item.type === 'lightsaber' || system.type === 'lightsaber') return true;
    if (item.flags?.swse?.isLightsaber || item.flags?.['foundryvtt-swse']?.isLightsaber) return true;
    if (system.lightsaber || system.chassisId || system.constructible === true) return true;
    if (String(item.type || '').toLowerCase() !== 'weapon') return false;

    const tokens = [
      item.name,
      system.subtype,
      system.subcategory,
      system.category,
      system.itemType,
      system.itemCategory,
      system.weaponCategory,
      system.weaponSubtype,
      system.weaponType,
      system.group,
      system.family,
      ...(Array.isArray(system.properties) ? system.properties : []),
      ...(Array.isArray(system.traits) ? system.traits : []),
      ...(Array.isArray(system.tags) ? system.tags : [])
    ]
      .filter(value => value !== undefined && value !== null)
      .map(value => String(value).toLowerCase())
      .join(' ');
    return /\blightsabers?\b|\blightfoils?\b/.test(tokens);
  }

  static getOwnedLightsabers(actor) {
    const collection = actor?.items ?? [];
    const items = Array.isArray(collection)
      ? collection
      : (typeof collection.values === 'function' ? Array.from(collection.values()) : []);
    return items.filter(item => this.isLightsaberItem(item));
  }

  static hasSelfBuiltLightsaber(actor) {
    return this.getOwnedLightsabers(actor).some(item => (item.flags?.["foundryvtt-swse"]?.builtBy ?? item.flags?.swse?.builtBy) === actor?.id);
  }

  static getEligibility(actor) {
    return this.#validateEligibility(actor);
  }

  static #getActorItems(actor) {
    const collection = actor?.items ?? [];
    if (Array.isArray(collection)) return collection;
    if (typeof collection.values === 'function') return Array.from(collection.values());
    if (typeof collection.filter === 'function') return collection.filter(() => true);
    return [];
  }

  static #normalizeFeatureKey(value) {
    return String(value ?? '')
      .toLowerCase()
      .replace(/&amp;/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  static #featureNameCandidates(value) {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (typeof value !== 'object') return [String(value)];
    return [
      value.name,
      value.label,
      value.title,
      value.id,
      value._id,
      value.slug,
      value.key,
      value.system?.name,
      value.system?.label,
      value.system?.id,
      value.system?.slug,
      ...Object.keys(value || {})
    ].filter(Boolean);
  }

  static #matchesAnyName(value, names = []) {
    const accepted = new Set(names.map(name => this.#normalizeFeatureKey(name)).filter(Boolean));
    if (!accepted.size) return false;
    return this.#featureNameCandidates(value).some(candidate => accepted.has(this.#normalizeFeatureKey(candidate)));
  }

  static #scanSystemListsForName(system = {}, names = []) {
    const listKeys = [
      'features',
      'featureList',
      'classFeatures',
      'startingFeatures',
      'starting_features',
      'grantedFeats',
      'granted_feats',
      'grantedProficiencies',
      'granted_proficiencies',
      'proficiencies',
      'weaponProficiencies',
      'weapon_proficiencies'
    ];

    for (const key of listKeys) {
      const value = system?.[key];
      if (!value) continue;
      const entries = Array.isArray(value)
        ? value
        : (typeof value === 'object' ? Object.entries(value).flatMap(([entryKey, entryValue]) => [entryKey, entryValue]) : [value]);
      if (entries.some(entry => this.#matchesAnyName(entry, names))) return true;
    }

    const weaponProfValue = system?.traits?.weaponProf?.value || system?.traits?.weaponProficiencies?.value;
    if (Array.isArray(weaponProfValue) && weaponProfValue.some(entry => this.#matchesAnyName(entry, names))) return true;

    return false;
  }

  static #classItemHasFeature(classItem, names = []) {
    const system = classItem?.system || {};
    const classLevel = Number(system.level ?? system.classLevel ?? system.value ?? 0) || 0;

    if (this.#scanSystemListsForName(system, names)) return true;

    const progressions = [
      ...(Array.isArray(system.level_progression) ? system.level_progression : []),
      ...(Array.isArray(system.levelProgression) ? system.levelProgression : []),
      ...(Array.isArray(system.progression) ? system.progression : [])
    ];

    for (const row of progressions) {
      const rowLevel = Number(row?.level ?? row?.lvl ?? 0) || 0;
      if (rowLevel > 0 && classLevel > 0 && rowLevel > classLevel) continue;
      const features = [
        ...(Array.isArray(row?.features) ? row.features : []),
        ...(Array.isArray(row?.grants) ? row.grants : []),
        ...(Array.isArray(row?.grantedFeats) ? row.grantedFeats : []),
        ...(Array.isArray(row?.grantedProficiencies) ? row.grantedProficiencies : [])
      ];
      if (features.some(feature => this.#matchesAnyName(feature, names))) return true;
    }

    return false;
  }

  static #actorHasNamedFeature(actor, names = [], { itemTypes = null } = {}) {
    const allowedTypes = itemTypes ? new Set(itemTypes.map(type => String(type).toLowerCase())) : null;
    for (const item of this.#getActorItems(actor)) {
      const type = String(item?.type || '').toLowerCase();
      if (allowedTypes && !allowedTypes.has(type)) continue;
      if (this.#matchesAnyName(item, names)) return true;
      if (this.#matchesAnyName(item?.system, names)) return true;
      if (type === 'class' && this.#classItemHasFeature(item, names)) return true;
      if (this.#scanSystemListsForName(item?.system || {}, names)) return true;
    }
    return false;
  }

  static #getNamedClassLevel(actor, names = []) {
    let total = 0;
    for (const item of this.#getActorItems(actor)) {
      if (String(item?.type || '').toLowerCase() !== 'class') continue;
      const classMatches = this.#matchesAnyName(item, names)
        || this.#matchesAnyName(item?.system, names)
        || this.#matchesAnyName(item?.system?.class_name, names)
        || this.#matchesAnyName(item?.system?.classId, names);
      if (!classMatches) continue;
      total += Number(item?.system?.level ?? item?.system?.classLevel ?? item?.system?.value ?? 0) || 0;
    }
    return total;
  }

  static #actorHasForceSensitivity(actor) {
    if (actor?.system?.forceSensitive === true) return true;
    if (actor?.system?.force?.sensitive === true) return true;
    if (actor?.system?.traits?.forceSensitive === true) return true;
    return this.#actorHasNamedFeature(actor, ['Force Sensitivity', 'Force Sensitive', 'swse feat force sensitivity'], {
      itemTypes: ['feat', 'class', 'classfeature', 'class_feature', 'feature']
    });
  }

  static #actorHasLightsaberProficiency(actor) {
    if (this.#scanSystemListsForName(actor?.system || {}, [
      'Weapon Proficiency (Lightsabers)',
      'Weapon Proficiency Lightsabers',
      'Lightsabers'
    ])) return true;

    return this.#actorHasNamedFeature(actor, [
      'Weapon Proficiency (Lightsabers)',
      'Weapon Proficiency Lightsabers',
      'Lightsaber Proficiency',
      'Lightsabers',
      'swse feat weapon proficiency lightsabers'
    ], {
      itemTypes: ['feat', 'proficiency', 'class', 'classfeature', 'class_feature', 'feature']
    });
  }

  static getEditState(item) {
    const canonical = item?.flags?.["foundryvtt-swse"] ?? {};
    const legacy = item?.flags?.swse ?? {};
    const flags = { ...legacy, ...canonical };
    const cfg = flags.lightsaberConfig ?? {};
    // Extract saber state for edit mode rendering.
    // Existing/granted/found sabers have no builtBy flag and are edit-only (cannot attune).
    // Self-built sabers have builtBy set to the creator's actor ID.
    return {
      chassisId: cfg.chassisId ?? item?.system?.chassisId ?? null,
      crystalId: cfg.crystalId ?? null,
      accessoryIds: Array.isArray(cfg.accessoryIds) ? [...cfg.accessoryIds] : [],
      bladeColor: flags.bladeColor ?? cfg.bladeColor ?? 'blue',
      lightsaberStyle: flags.lightsaberStyle ?? cfg.lightsaberStyle ?? item?.system?.visual?.lightsaberStyle ?? 'auto',
      builtBy: flags.builtBy ?? null,
      attunedBy: flags.attunedBy ?? null,
      selfBuilt: !!flags.builtBy
    };
  }

  static getUseTheForceTotal(actor) {
    const direct = [
      actor?.system?.derived?.skills?.useTheForce?.total,
      actor?.system?.derived?.skillsByKey?.useTheForce?.total,
      actor?.system?.skills?.useTheForce?.total,
      actor?.system?.skills?.useTheForce?.value,
      actor?.system?.skills?.useTheForce?.mod
    ];
    for (const value of direct) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }

    const skill = actor?.system?.skills?.useTheForce ?? {};
    const abilityKey = skill.selectedAbility || skill.ability || 'cha';
    const ability = actor?.system?.derived?.attributes?.[abilityKey]
      ?? actor?.system?.attributes?.[abilityKey]
      ?? actor?.system?.abilities?.[abilityKey]
      ?? {};
    const abilityTotal = Number(ability.total);
    const abilityMod = Number.isFinite(Number(ability.mod))
      ? Number(ability.mod)
      : (Number.isFinite(abilityTotal) ? Math.floor((abilityTotal - 10) / 2) : 0);
    const heroicLevel = getHeroicLevel(actor);
    const halfLevel = Math.max(0, Math.floor((Number(heroicLevel) || Number(actor?.system?.level) || 1) / 2));
    const trained = skill.trained === true ? 5 : 0;
    const focused = skill.focused === true ? 5 : 0;
    const misc = Number(skill.miscMod ?? skill.misc ?? 0) || 0;
    return abilityMod + halfLevel + trained + focused + misc;
  }

  static async getBuildPreview(actor, config) {
    const eligibility = this.getEligibility(actor);
    if (!eligibility?.eligible) {
      return { success: false, reason: eligibility.reason, eligibility };
    }
    const resolved = await this.#resolveSelections(actor, config);
    if (!resolved.success) return resolved;

    const { chassis, crystal, accessories } = resolved;
    const baseDc = chassis.system?.baseBuildDc ?? 20;
    const crystalDcMod = crystal.system?.lightsaber?.buildDcModifier ?? 0;
    const accessoryDcMod = accessories.reduce((sum, a) => sum + (a.system?.lightsaber?.buildDcModifier ?? 0), 0);
    const finalDc = baseDc + crystalDcMod + accessoryDcMod;
    const baseCost = chassis.system?.baseCost ?? chassis.system?.cost ?? 0;
    const totalCost = baseCost + (crystal.system?.cost ?? 0) + accessories.reduce((sum, a) => sum + (a.system?.cost ?? 0), 0);
    const modifier = this.getUseTheForceTotal(actor);
    const take10Total = modifier + 10;
    return {
      success: true,
      chassis: this.#summarizeOption(chassis),
      crystal: this.#summarizeOption(crystal),
      accessories: accessories.map(a => this.#summarizeOption(a)),
      finalDc,
      totalCost,
      modifier,
      take10Total,
      canTake10: take10Total >= finalDc,
      timeHours: 24,
      eligibility
    };
  }

  static async applyEdits(actor, weapon, config) {
    if (!actor || !weapon || !this.isLightsaberItem(weapon)) {
      return { success: false, reason: 'invalid_target' };
    }

    const resolved = await this.#resolveSelections(actor, {
      chassisItemId: config?.chassisItemId ?? weapon.system?.chassisId,
      crystalItemId: config?.crystalItemId,
      accessoryItemIds: config?.accessoryItemIds || []
    });
    if (!resolved.success) return resolved;

    const { chassis, crystal, accessories } = resolved;
    const resolvedChassisId = chassis?.system?.chassisId || chassis?.id || config?.chassisItemId || weapon.system?.chassisId || 'standard';
    const modifiers = [];
    if (Array.isArray(crystal.system?.modifiers)) modifiers.push(...crystal.system.modifiers);
    for (const accessory of accessories) {
      if (Array.isArray(accessory.system?.modifiers)) modifiers.push(...accessory.system.modifiers);
    }

    const baseName = weapon.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const accessoryNames = accessories.map(a => a.name).join(', ');
    const suffix = accessoryNames ? ` (${crystal.name} + ${accessoryNames})` : ` (${crystal.name})`;
    const damageTypeOverride = modifiers.find(m => m.type === 'DAMAGE_TYPE_CHANGE')?.value;
    const update = {
      _id: weapon.id,
      name: `${baseName}${suffix}`,
      'system.chassisId': resolvedChassisId,
      'system.modifiers': modifiers,
      'flags.foundryvtt-swse.bladeColor': config?.bladeColor || 'blue',
      'flags.swse.bladeColor': config?.bladeColor || 'blue',
      'flags.foundryvtt-swse.lightsaberStyle': config?.lightsaberStyle || config?.styleKey || 'auto',
      'flags.swse.lightsaberStyle': config?.lightsaberStyle || config?.styleKey || 'auto',
      'system.visual.lightsaberStyle': config?.lightsaberStyle || config?.styleKey || 'auto',
      'flags.foundryvtt-swse.lightsaberConfig': {
        chassisId: resolvedChassisId,
        crystalId: crystal.id,
        accessoryIds: accessories.map(a => a.id),
        bladeColor: config?.bladeColor || 'blue',
        lightsaberStyle: config?.lightsaberStyle || config?.styleKey || 'auto'
      },
      'flags.swse.lightsaberConfig': {
        chassisId: resolvedChassisId,
        crystalId: crystal.id,
        accessoryIds: accessories.map(a => a.id),
        bladeColor: config?.bladeColor || 'blue',
        lightsaberStyle: config?.lightsaberStyle || config?.styleKey || 'auto'
      }
    };
    if (damageTypeOverride) update['system.damageType'] = String(damageTypeOverride).toLowerCase();

    try {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update]);
      return { success: true, itemId: weapon.id };
    } catch (err) {
      SWSELogger.error('applyEdits failed:', err);
      return { success: false, reason: 'mutation_failed', error: err.message };
    }
  }

  /**
   * Attempt lightsaber construction
   *
   * Flow:
   * 1. Basic input validation
   * 1.5. Check actor eligibility (level, feats, force sensitivity) - FAIL FAST
   * 2. Resolve items by ID and validate constructibility
   * 3. Validate compatibility (chassis vs upgrades)
   * 4. Calculate final DC
   * 5. Calculate total cost
   * 6. Validate credit availability
   * 7. Execute Use the Force roll (uses actor.system.skills.useTheForce.total with all modifiers)
   * 8. On success: atomic mutation (deduct credits, create item, inject metadata)
   *
   * @param {Actor} actor - Actor attempting construction
   * @param {Object} config - { chassisItemId, crystalItemId, accessoryItemIds: [], bladeColor?: string }
   * @returns {Promise<Object>} { success, reason?, itemId?, finalDc?, rollTotal?, modifier? }
   */
  static async attemptConstruction(actor, config) {
    try {
      // Step 1: Validate input
      if (!actor) {
        return { success: false, reason: "no_actor" };
      }

      if (!config?.chassisItemId) {
        return { success: false, reason: "no_chassis_selected" };
      }

      // Step 1.5: Check eligibility (fail fast, before item resolution)
      const eligibilityCheck = this.#validateEligibility(actor);
      if (!eligibilityCheck.eligible) {
        return { success: false, reason: eligibilityCheck.reason };
      }

      // Step 2: Resolve selections from compendium/actor inventory
      const resolved = await this.#resolveSelections(actor, config);
      if (!resolved.success) return resolved;
      const { chassis, crystal, accessories } = resolved;

      // Step 3: Validate compatibility
      const chassisId = chassis.system.chassisId;

      // Check crystal compatibility
      const crystalCompat = crystal.system.lightsaber?.compatibleChassis || [];
      if (!this.#isCompatible(crystalCompat, chassisId)) {
        return { success: false, reason: "crystal_incompatible_chassis" };
      }

      // Check each accessory compatibility
      for (const accessory of accessories) {
        const accessoryCompat = accessory.system.lightsaber?.compatibleChassis || [];
        if (!this.#isCompatible(accessoryCompat, chassisId)) {
          return { success: false, reason: "accessory_incompatible_chassis" };
        }
      }

      // Step 4: Calculate final DC
      const baseDc = chassis.system.baseBuildDc ?? 20;
      const crystalDcMod = crystal.system.lightsaber?.buildDcModifier ?? 0;
      const accessoryDcMod = accessories.reduce(
        (sum, a) => sum + (a.system.lightsaber?.buildDcModifier ?? 0),
        0
      );
      const finalDc = baseDc + crystalDcMod + accessoryDcMod;

      // Step 5: Calculate total cost
      const baseCost = chassis.system.baseCost ?? 0;
      const crystalCost = crystal.system.cost ?? 0;
      const accessoryCost = accessories.reduce(
        (sum, a) => sum + (a.system.cost ?? 0),
        0
      );
      const totalCost = baseCost + crystalCost + accessoryCost;

      // Step 6: Check credit availability
      const fundValidation = LedgerService.validateFunds(actor, totalCost);
      if (!fundValidation.ok) {
        return { success: false, reason: "insufficient_credits" };
      }

      // Step 7: Execute Use the Force roll
      // Take 10 is only allowed if 10 + modifier >= DC (enforced by UI, but validated here too)
      // Take 20 is never allowed for lightsaber construction
      const modifier = this.getUseTheForceTotal(actor);
      let rollTotal = 0;
      let rollRaw = null;
      const checkMode = config?.checkMode === 'take10' ? 'take10' : 'roll';
      if (checkMode === 'take10') {
        rollTotal = modifier + 10;
        if (rollTotal < finalDc) {
          return { success: false, reason: 'take10_insufficient', finalDc, rollTotal, modifier, checkMode };
        }
      } else {
        const formula = `1d20 + ${modifier}`;
        let roll;
        try {
          roll = await RollEngine.safeRoll(formula);
        } catch (err) {
          SWSELogger.error("Construction roll failed:", err);
          return { success: false, reason: "roll_failed" };
        }
        rollTotal = roll.total;
        rollRaw = Number(rollTotal) - Number(modifier || 0);
      }

      // Step 8: Check roll result
      if (rollTotal < finalDc) {
        return {
          success: false,
          reason: "roll_failed",
          finalDc,
          rollTotal,
          modifier,
          rollRaw,
          checkMode
        };
      }

      // Step 9: ATOMIC MUTATION - Only on success
      try {
        // 9a: Deduct credits
        const creditPlan = LedgerService.buildCreditDelta(actor, totalCost);
        await ActorEngine.applyMutationPlan(actor, creditPlan);

        // 9b: Create new weapon from chassis template
        const newWeapon = this.#createBuiltLightsaber(
          chassis,
          crystal,
          accessories,
          actor.id,
          game.time.worldTime,
          config.bladeColor,
          config.lightsaberStyle || config.styleKey || 'auto'
        );

        const created = await ActorEngine.createEmbeddedDocuments(actor, "Item", [newWeapon]);
        const itemId = created[0]?.id;

        if (!itemId) {
          throw new Error("Failed to create lightsaber item");
        }

        try {
          await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberConstructionDeferred');
          await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberConstructionAvailable');
          await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberConstructionPrompted');
        } catch (_err) {}

        return {
          success: true,
          itemId,
          finalDc,
          rollTotal,
          modifier,
          cost: totalCost,
          rollRaw,
          checkMode
        };
      } catch (err) {
        SWSELogger.error("Construction mutation failed:", err);
        return { success: false, reason: "mutation_failed" };
      }

    } catch (err) {
      SWSELogger.error("attemptConstruction failed:", err);
      return { success: false, reason: "internal_error" };
    }
  }

  static #summarizeOption(item) {
    return {
      id: item.id,
      _id: item.id,
      name: item.name,
      img: item.img,
      type: item.type,
      system: foundry.utils.deepClone(item.system ?? {}),
      flags: foundry.utils.deepClone(item.flags ?? {}),
      description: item.system?.description ?? '',
      rarity: item.system?.lightsaber?.rarity ?? item.system?.rarity ?? 'common',
      buildDcModifier: item.system?.lightsaber?.buildDcModifier ?? 0,
      cost: item.system?.cost ?? 0,
      compatibleChassis: item.system?.lightsaber?.compatibleChassis || [],
      bladeColor: item.system?.lightsaber?.bladeColor || 'Varies'
    };
  }

  static async #resolveSelections(actor, config) {
    const catalogs = await this.getCatalogOptions();
    const byId = (arr, id) => {
      if (!id) return undefined;
      const needle = String(id).trim().toLowerCase();
      return arr.find(entry => {
        const candidates = [
          entry.id,
          entry._id,
          entry.key,
          entry.uuid,
          entry.system?.chassisId,
          entry.system?.lightsaber?.componentId,
          entry.system?.lightsaber?.crystalType,
          entry.system?.lightsaber?.family,
          entry.name
        ].filter(Boolean).map(v => String(v).trim().toLowerCase());
        return candidates.some(c => c === needle);
      });
    };
    const ownedById = id => actor?.items?.get?.(id);

    const chassis = ownedById(config?.chassisItemId) || byId(catalogs.chassis, config?.chassisItemId);
    if (!chassis) return { success: false, reason: 'chassis_not_found' };
    if (!(this.isLightsaberItem(chassis) && chassis.system?.constructible === true)) {
      return { success: false, reason: 'invalid_chassis' };
    }

    const crystal = ownedById(config?.crystalItemId) || byId(catalogs.crystals, config?.crystalItemId);
    if (!crystal) return { success: false, reason: 'crystal_not_found' };
    if (!(crystal.type === 'weaponUpgrade' && crystal.system?.lightsaber?.category === 'crystal')) {
      return { success: false, reason: 'invalid_crystal' };
    }

    const accessories = [];
    for (const accessoryId of (config?.accessoryItemIds || [])) {
      const accessory = ownedById(accessoryId) || byId(catalogs.accessories, accessoryId);
      if (!accessory) return { success: false, reason: 'accessory_not_found' };
      if (!(accessory.type === 'weaponUpgrade' && accessory.system?.lightsaber?.category === 'accessory')) {
        return { success: false, reason: 'invalid_accessory' };
      }
      accessories.push(accessory);
    }
    return { success: true, chassis, crystal, accessories };
  }

  /**
   * Check if an upgrade is compatible with a chassis
   * @private
   */
  static #normalizeCompatibilityToken(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/^-+|-+$/g, '');
  }

  static #getChassisCompatibilityKeys(chassisId) {
    const base = this.#normalizeCompatibilityToken(chassisId);
    const keys = new Set([base].filter(Boolean));
    if (/lightfoil|dueling|makashi|foil/.test(base)) {
      keys.add('dueling');
      keys.add('standard');
    }
    if (/shoto|short/.test(base)) {
      keys.add('short');
      keys.add('shoto');
      keys.add('standard');
    }
    if (/double/.test(base)) keys.add('double');
    if (/great/.test(base)) keys.add('great');
    if (/pike|longhandle/.test(base)) {
      keys.add('pike');
      keys.add('longhandle');
    }
    if (/crossguard|cross/.test(base)) keys.add('crossguard');
    if (/dual-phase|dualphase/.test(base)) keys.add('dual-phase');
    if (/lightwhip|whip/.test(base)) keys.add('lightwhip');
    if (!keys.size) keys.add('standard');
    return keys;
  }

  static #isCompatible(compatibleChassis, chassisId) {
    if (!compatibleChassis || !Array.isArray(compatibleChassis) || !compatibleChassis.length) {
      return true;
    }
    if (compatibleChassis.includes("*")) return true;
    const allowed = new Set(compatibleChassis.map(value => this.#normalizeCompatibilityToken(value)).filter(Boolean));
    const chassisKeys = this.#getChassisCompatibilityKeys(chassisId);
    return [...chassisKeys].some(key => allowed.has(key));
  }

  /**
   * Create a new lightsaber item cloned from the chassis template
   * Applies crystal and accessory modifiers
   * Injects builder metadata
   * @private
   */
  static #createBuiltLightsaber(chassis, crystal, accessories, builderId, builtAt, bladeColor = null, lightsaberStyle = 'auto') {
    // Clone chassis as base
    const baseData = typeof chassis.toObject === "function" ? chassis.toObject() : foundry.utils.deepClone(chassis);

    // Generate unique name combining components
    const crystalName = crystal.name;
    const accessoryNames = accessories.map(a => a.name).join(", ");
    const accessorySuffix = accessoryNames ? ` with ${accessoryNames}` : "";
    const newName = `${baseData.name} (${crystalName}${accessorySuffix})`;

    // Build modifier array from upgrades
    const modifiers = [];

    // Add crystal modifiers
    if (crystal.system.modifiers && Array.isArray(crystal.system.modifiers)) {
      modifiers.push(...crystal.system.modifiers);
    }

    // Add accessory modifiers
    for (const accessory of accessories) {
      if (accessory.system.modifiers && Array.isArray(accessory.system.modifiers)) {
        modifiers.push(...accessory.system.modifiers);
      }
    }

    // Prepare new item data
    const newItem = {
      ...baseData,
      _id: undefined, // Let Foundry generate new ID
      name: newName,
      system: {
        ...baseData.system,
        modifiers
      },
      flags: {
        ...baseData.flags,
        "foundryvtt-swse": {
          ...(baseData.flags?.["foundryvtt-swse"] || {}),
          builtBy: builderId,
          builtAt: builtAt,
          attunedBy: null,
          bladeColor: bladeColor || "blue",
          lightsaberStyle: lightsaberStyle || 'auto',
          lightsaberConfig: {
            chassisId: chassis.system?.chassisId ?? null,
            crystalId: crystal.id,
            accessoryIds: accessories.map(a => a.id),
            bladeColor: bladeColor || "blue",
            lightsaberStyle: lightsaberStyle || 'auto'
          }
        },
        swse: {
          ...(baseData.flags?.swse || {}),
          builtBy: builderId,
          builtAt: builtAt,
          attunedBy: null,
          bladeColor: bladeColor || "blue",
          lightsaberStyle: lightsaberStyle || 'auto',
          lightsaberConfig: {
            chassisId: chassis.system?.chassisId ?? null,
            crystalId: crystal.id,
            accessoryIds: accessories.map(a => a.id),
            bladeColor: bladeColor || "blue",
            lightsaberStyle: lightsaberStyle || 'auto'
          }
        }
      }
    };

    return newItem;
  }

  /**
   * Validate actor eligibility for lightsaber construction
   * Checks level gating and feat requirements based on construction mode setting
   *
   * @private
   * @param {Actor} actor - The actor to check
   * @returns {Object} { eligible: boolean, reason?: string }
   */
  static #validateEligibility(actor) {
    if (!actor) {
      return { eligible: false, reason: "no_actor" };
    }

    try {
      // Get construction mode setting
      const rawMode = game?.settings?.get?.(game.system.id, "lightsaberConstructionMode") || "raw";
      const mode = rawMode === "standard" ? "raw" : rawMode;

      // Get level authorities (NOT raw field access)
      const heroicLevel = getHeroicLevel(actor);
      const jediLevel = Math.max(
        Number(getClassLevel(actor, "jedi")) || 0,
        this.#getNamedClassLevel(actor, ["Jedi", "jedi"])
      );

      // Level gating based on mode
      switch (mode) {
        case "jediOnly":
          // Jedi class required, must be level 7+ in Jedi
          if (jediLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_jedi_level",
              details: { jediLevel, required: 7 }
            };
          }
          break;

        case "heroicAndJedi":
          // Requires heroic 7 AND Jedi 1
          if (heroicLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_heroic_level",
              details: { heroicLevel, required: 7 }
            };
          }
          if (jediLevel < 1) {
            return {
              eligible: false,
              reason: "insufficient_jedi_level",
              details: { jediLevel, required: 1 }
            };
          }
          break;

        case "raw":
        default:
          // Just needs heroic 7
          if (heroicLevel < 7) {
            return {
              eligible: false,
              reason: "insufficient_heroic_level",
              details: { heroicLevel, required: 7 }
            };
          }
          break;
      }

      // Check Force Sensitivity across canonical flags, owned feats, and class-granted
      // features. Jedi and several imported/progression actors grant this as a
      // starting class feature rather than as a normalized feat item.
      if (!this.#actorHasForceSensitivity(actor)) {
        return {
          eligible: false,
          reason: "missing_force_sensitivity"
        };
      }

      // Check Weapon Proficiency (Lightsabers) across normalized feat IDs,
      // actor proficiency arrays, and class-granted starting features. Jedi
      // actors frequently receive this from class data instead of an owned feat.
      if (!this.#actorHasLightsaberProficiency(actor)) {
        return {
          eligible: false,
          reason: "missing_lightsaber_proficiency"
        };
      }

      // All checks passed
      return { eligible: true };

    } catch (err) {
      SWSELogger.error("eligibility check failed:", err);
      return {
        eligible: false,
        reason: "eligibility_check_error",
        error: err.message
      };
    }
  }
}
