/**
 * Droid Customization Engine
 *
 * Phase 4: Dedicated droid customization lane
 *
 * This engine handles real-time droid system modifications (add/remove systems).
 * Unlike generic first-wave customization (weapons/armor/gear), droids have:
 * - Their own system types (locomotion, processor, armor, appendages, sensors)
 * - Their own pricing authority (DROID_SYSTEMS from droid chargen)
 * - Chassis/degree restrictions on system eligibility
 * - Distinct mutation model (installed systems, not slots)
 *
 * CRITICAL REUSE RULE:
 * This engine REUSES the existing droid chargen authority for all system definitions,
 * prices, and eligibility rules. If chargen knows what a system costs, customization
 * asks chargen instead of inventing the value. This avoids drift between chargen and
 * later droid editing.
 *
 * MUTATION AUTHORITY:
 * All mutations route through ActorEngine.applyMutationPlan().
 * The UI is purely requester/viewer; no direct item.update() or actor.update().
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { DROID_SYSTEMS } from '/systems/foundryvtt-swse/scripts/data/droid-systems.js';
import { computeDroidPartCost, getAllDroidPartDefinitions, getDroidCostFactor, hydrateDroidPart, normalizeDroidPartId } from '/systems/foundryvtt-swse/scripts/data/droid-part-schema.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';


function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.values === 'function') return Array.from(value.values());
  return Array.from(value ?? []);
}

function humanize(value) {
  return String(value ?? '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizedCredits(actor) {
  return Number(actor?.system?.credits ?? actor?.system?.currency?.credits ?? actor?.system?.wealth?.credits ?? 0) || 0;
}

function collectInstalledDroidPartIds(actor) {
  const systems = actor?.system?.droidSystems ?? {};
  const installed = new Set(Object.keys(actor?.system?.installedSystems ?? {}).map(normalizeDroidPartId));
  const add = (value) => { const id = normalizeDroidPartId(value); if (id) installed.add(id); };
  add(systems.processor?.id); add(systems.processor?.name);
  add(systems.backupProcessor?.id); add(systems.backupProcessor?.name);
  add(systems.processorSlots?.backup?.id); add(systems.processorSlots?.backup?.name);
  add(systems.locomotion?.id); add(systems.locomotion?.name);
  for (const key of ['appendages', 'locomotionSystems', 'secondaryLocomotion', 'sensors', 'weapons', 'accessories', 'integratedSystems']) {
    for (const entry of asArray(systems[key])) { add(entry?.id); add(entry?.name); }
  }
  for (const item of asArray(actor?.items)) { add(item?.system?.droidPartId); add(item?.flags?.swse?.droidPartId); add(item?.name); }
  return installed;
}

function hasBackupProcessorSlot(actor) {
  const ids = collectInstalledDroidPartIds(actor);
  return ids.has('backup-processor') || Boolean(actor?.system?.droidSystems?.processorSlots?.backup || actor?.system?.droidSystems?.backupProcessor);
}

function isPrimaryProcessor(def) {
  return def?.category === 'processor' && (String(def?.slot ?? '').includes('primary') || ['basic-processor', 'heuristic-processor', 'remote-processor', 'military-processor'].includes(normalizeDroidPartId(def?.id)));
}

function droidPartEntry(def, actor, extra = {}) {
  const hydrated = hydrateDroidPart(def, { actor, installedIds: collectInstalledDroidPartIds(actor) });
  const cost = computeDroidPartCost(actor, hydrated, extra);
  return {
    id: normalizeDroidPartId(hydrated.ruleId ?? hydrated.id),
    name: hydrated.name,
    description: hydrated.description,
    type: hydrated.category || def?.category || 'accessory',
    category: hydrated.category || def?.category || 'accessory',
    slot: hydrated.slot || def?.slot || '',
    sourcePath: def?.sourcePath ?? '',
    installed: collectInstalledDroidPartIds(actor).has(normalizeDroidPartId(hydrated.ruleId ?? hydrated.id)),
    compatible: true,
    cost,
    resale: Math.floor(cost * 0.5),
    availability: hydrated.availability ?? '-',
    prerequisites: [...(hydrated.prerequisiteIds ?? []), ...(hydrated.prerequisiteAnyIds ?? [])],
    modifiers: hydrated.modifiers ?? [],
    features: hydrated.features ?? [],
    restrictions: hydrated.restrictions ?? [],
    weaponProfile: hydrated.weaponProfile ?? null,
    rules: hydrated.rules ?? {},
    ...extra
  };
}

export class DroidCustomizationEngine {
  /**
   * Get normalized droid profile for customization purposes
   * REUSE: Leverages canonical droid systems definitions from chargen authority
   */
  static getNormalizedDroidProfile(actor) {
    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor' };
    }

    const droidSystems = actor.system?.droidSystems ?? {};
    const installedSystems = actor.system?.installedSystems ?? {};
    const degree = actor.system?.degree ?? 'independent';
    const size = droidSystems.size ?? 'medium';

    return {
      success: true,
      profile: {
        actorId: actor.id,
        actorName: actor.name,
        degree,
        size,
        chassis: droidSystems.chassis,
        locomotion: droidSystems.locomotion,
        processor: droidSystems.processor,
        armor: droidSystems.armor,
        appendages: droidSystems.appendages ?? [],
        sensors: droidSystems.sensors ?? [],
        installedSystems: Object.keys(installedSystems)
      }
    };
  }

  /**
   * Get available droid systems for customization
   * REUSE: Pulls from canonical DROID_SYSTEMS chargen authority
   */
  static getAvailableSystems(actor) {
    if (!actor || actor.type !== 'droid') {
      return {
        success: false,
        error: 'Not a droid actor',
        systems: []
      };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return {
        success: false,
        error: 'Failed to get droid profile',
        systems: []
      };
    }

    const installed = collectInstalledDroidPartIds(actor);
    const backupSlot = hasBackupProcessorSlot(actor);
    const hasPrimaryProcessor = Boolean(actor.system?.droidSystems?.processor?.id || actor.system?.droidSystems?.processor?.name);
    const systems = [];

    for (const def of getAllDroidPartDefinitions()) {
      const entry = droidPartEntry(def, actor);
      entry.installed = installed.has(entry.id);
      if (isPrimaryProcessor(def) && hasPrimaryProcessor && !entry.installed && !backupSlot) {
        entry.compatible = false;
        entry.blockingReason = 'A primary processor is already installed. Install a Backup Processor before purchasing a second inactive processor.';
      }
      if (isPrimaryProcessor(def) && backupSlot && !entry.installed) {
        entry.slot = entry.slot || 'processor.backup';
        entry.compatible = true;
        entry.note = 'Can be installed in the backup processor slot; only one processor is active at a time.';
      }
      systems.push(entry);
    }

    return {
      success: true,
      systems
    };
  }

  /**
   * Preview proposed droid customization changes
   * Shows what would happen if user adds/removes systems
   * REUSE: Uses chargen-authority costs for preview
   */
  static previewDroidCustomization(actor, changeSet = {}) {
    const warnings = [];

    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor', blockingReason: 'Invalid actor type' };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return { success: false, error: 'Failed to get droid profile' };
    }

    const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;
    const currentCredits = normalizedCredits(actor);
    let totalAddCost = 0;
    let totalRemoveSale = 0;

    const addedSystems = [];
    const removedSystems = [];

    // Validate systems to add
    for (const systemId of systemsToAdd) {
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      const candidate = droidPartEntry(systemDef, actor);
      if (candidate.compatible === false) {
        return { success: false, error: candidate.blockingReason || `${candidate.name} is not compatible with this droid`, blockingReason: 'System incompatible' };
      }
      if (isPrimaryProcessor(systemDef) && actor.system?.droidSystems?.processor?.id && !hasBackupProcessorSlot(actor)) {
        return {
          success: false,
          error: 'A primary processor is already installed. Install a Backup Processor before purchasing a second inactive processor.',
          blockingReason: 'Backup processor slot required'
        };
      }
      const cost = this.#computeSystemCost(actor, systemDef);
      totalAddCost += cost;
      addedSystems.push({ id: normalizeDroidPartId(systemId), name: systemDef.name, cost, category: candidate.category, slot: candidate.slot });
    }

    // Validate systems to remove
    for (const systemId of systemsToRemove) {
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      const removed = droidPartEntry(systemDef, actor);
      const resale = this.#computeSystemResale(actor, systemDef);
      totalRemoveSale += resale;
      removedSystems.push({ id: normalizeDroidPartId(systemId), name: systemDef.name, resale, category: removed.category, slot: removed.slot });
    }

    const netCost = totalAddCost - totalRemoveSale;
    const newCredits = currentCredits - netCost;

    if (newCredits < 0) {
      return {
        success: false,
        error: `Insufficient credits: need ${netCost}, have ${currentCredits}`,
        blockingReason: 'Insufficient funds',
        preview: {
          currentCredits,
          netCost,
          newCredits
        }
      };
    }

    return {
      success: true,
      preview: {
        actorId: actor.id,
        currentCredits,
        systemsAdded: addedSystems,
        systemsRemoved: removedSystems,
        totalAddCost,
        totalRemoveSale,
        netCost,
        newCredits
      }
    };
  }

  /**
   * Apply droid customization changes through ActorEngine
   * MUTATION AUTHORITY: ActorEngine is the sole mutation authority
   */
  static async applyDroidCustomization(actor, changeSet = {}) {
    if (!actor || actor.type !== 'droid') {
      return { success: false, error: 'Not a droid actor' };
    }

    const preview = this.previewDroidCustomization(actor, changeSet);
    if (!preview.success) {
      return preview;
    }

    try {
      const { add: systemsToAdd = [], remove: systemsToRemove = [] } = changeSet;
      const installedSystems = { ...(actor.system.installedSystems ?? {}) };
      const droidSystems = foundry.utils.deepClone(actor.system?.droidSystems ?? {});

      // Apply removals
      for (const systemId of systemsToRemove) {
        const normalized = normalizeDroidPartId(systemId);
        delete installedSystems[normalized];
        this.#applyRemovalToDroidSystems(droidSystems, normalized);
      }

      // Apply additions
      for (const systemId of systemsToAdd) {
        const systemDef = this.#findSystemDefinition(systemId);
        const entry = this.#buildInstalledPartPayload(systemDef, actor);
        installedSystems[entry.id] = entry;
        this.#applyAdditionToDroidSystems(actor, droidSystems, systemDef);
      }

      // Build mutation plan
      const creditDelta = LedgerService.buildCreditDelta(actor, preview.preview.netCost);

      // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
      // This is the only point where droid/actor data is written
      // UI must never bypass this through direct update() calls
      const mutationPlan = {
        set: {
          ...creditDelta.set,
          'system.installedSystems': installedSystems,
          'system.droidSystems': droidSystems
        }
      };

      await ActorEngine.applyMutationPlan(actor, mutationPlan);

      return {
        success: true,
        applied: {
          systemsAdded: preview.preview.systemsAdded,
          systemsRemoved: preview.preview.systemsRemoved,
          netCost: preview.preview.netCost,
          newCredits: preview.preview.newCredits
        }
      };
    } catch (err) {
      SWSELogger.error('Droid customization apply failed:', err);
      return { success: false, error: err.message };
    }
  }


  static #buildInstalledPartPayload(systemDef, actor, extra = {}) {
    const entry = droidPartEntry(systemDef, actor, extra);
    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      slot: entry.slot,
      cost: entry.cost,
      installedAt: Date.now(),
      ...extra
    };
  }

  static #applyAdditionToDroidSystems(actor, droidSystems, systemDef) {
    const entry = this.#buildInstalledPartPayload(systemDef, actor);
    const slot = String(entry.slot ?? '');
    const category = entry.category;

    if (category === 'processor') {
      const primaryLike = isPrimaryProcessor(systemDef);
      droidSystems.processorSlots ??= {};
      if (primaryLike) {
        if (!droidSystems.processor?.id) droidSystems.processor = entry;
        else if (hasBackupProcessorSlot(actor) || droidSystems.processorSlots?.backup || droidSystems.backupProcessor) {
          droidSystems.processorSlots.backup = { ...entry, active: false };
          droidSystems.backupProcessor = { ...entry, active: false };
        }
      } else if (entry.id === 'backup-processor' || entry.rules?.unlocksBackupProcessorSlot || slot.includes('backup')) {
        droidSystems.processorEnhancements ??= [];
        droidSystems.processorEnhancements = this.#upsertArrayEntry(droidSystems.processorEnhancements, entry);
        droidSystems.processorSlots.backup ??= null;
      } else {
        droidSystems.processorEnhancements ??= [];
        droidSystems.processorEnhancements = this.#upsertArrayEntry(droidSystems.processorEnhancements, entry);
      }
      return;
    }

    if (category === 'locomotion') {
      if (slot.includes('primary') || !droidSystems.locomotion?.id) droidSystems.locomotion = entry;
      else {
        droidSystems.locomotionSystems ??= [];
        droidSystems.locomotionSystems = this.#upsertArrayEntry(droidSystems.locomotionSystems, entry);
      }
      return;
    }

    if (category === 'appendage') {
      droidSystems.appendages ??= [];
      const nextLocation = this.#nextAppendageLocation(droidSystems.appendages);
      droidSystems.appendages = this.#upsertArrayEntry(droidSystems.appendages, { ...entry, location: entry.location ?? nextLocation });
      return;
    }

    if (category === 'armor') {
      droidSystems.armor = entry;
      return;
    }

    if (category === 'sensor') {
      droidSystems.sensors ??= [];
      droidSystems.sensors = this.#upsertArrayEntry(droidSystems.sensors, entry);
      return;
    }

    if (category === 'weapon' || entry.weaponProfile) {
      droidSystems.weapons ??= [];
      droidSystems.weapons = this.#upsertArrayEntry(droidSystems.weapons, entry);
      return;
    }

    droidSystems.accessories ??= [];
    droidSystems.accessories = this.#upsertArrayEntry(droidSystems.accessories, entry);
  }

  static #applyRemovalToDroidSystems(droidSystems, systemId) {
    const id = normalizeDroidPartId(systemId);
    const matches = (entry) => normalizeDroidPartId(entry?.id ?? entry?.name) === id;
    const removeFrom = (array) => asArray(array).filter(entry => !matches(entry));

    if (matches(droidSystems.processor)) delete droidSystems.processor;
    if (matches(droidSystems.backupProcessor)) delete droidSystems.backupProcessor;
    if (matches(droidSystems.processorSlots?.backup)) delete droidSystems.processorSlots.backup;
    if (matches(droidSystems.armor)) delete droidSystems.armor;
    for (const key of ['processorEnhancements', 'locomotionSystems', 'secondaryLocomotion', 'appendages', 'sensors', 'weapons', 'accessories', 'integratedSystems']) {
      if (Array.isArray(droidSystems[key])) droidSystems[key] = removeFrom(droidSystems[key]);
    }
  }

  static #upsertArrayEntry(array, entry) {
    const id = normalizeDroidPartId(entry?.id ?? entry?.name);
    const out = asArray(array).filter(existing => normalizeDroidPartId(existing?.id ?? existing?.name) !== id);
    out.push(entry);
    return out;
  }

  static #nextAppendageLocation(appendages = []) {
    const used = new Set(asArray(appendages).map(entry => normalizeDroidPartId(entry?.location ?? entry?.slot)));
    if (!used.has('left-arm')) return 'left-arm';
    if (!used.has('right-arm')) return 'right-arm';
    return `additional-${asArray(appendages).length + 1}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find system definition in canonical DROID_SYSTEMS authority
   * REUSE: Searches chargen source for system definition
   */
  static #findSystemDefinition(systemId) {
    const id = normalizeDroidPartId(systemId);
    return getAllDroidPartDefinitions().find(def => normalizeDroidPartId(def.id) === id || normalizeDroidPartId(def.name) === id) ?? null;
  }

  /**
   * Compute cost of a system for a specific droid actor.
   * REUSE: Uses droid-part-schema, which wraps the canonical chargen DROID_SYSTEMS
   * source and understands cost factor, formulas, and x2/x5 dependent costs.
   */
  static #computeSystemCost(actor, systemDef) {
    return computeDroidPartCost(actor, systemDef);
  }

  /**
   * Compute resale value of a system (50% of purchase cost)
   */
  static #computeSystemResale(actor, systemDef) {
    const purchaseCost = this.#computeSystemCost(actor, systemDef);
    return Math.floor(purchaseCost * 0.5);
  }

  /**
   * Get cost factor for droid size
   * Used by chargen cost formulas
   */
  static #getCostFactor(size) {
    return getDroidCostFactor(size);
  }
}
