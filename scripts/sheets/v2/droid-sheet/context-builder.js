/**
 * scripts/sheets/v2/droid-sheet/context-builder.js
 *
 * Live-path Droid Sheet context builder.
 *
 * Originally seeded (Phase 2) from panel-shaping ideas in a parallel dormant
 * droid implementation; that parallel tree was removed in Phase 3C. This
 * builder is now the only droid context builder in the repo, adapted to the
 * live-registered SWSEV2DroidSheet template
 * (`templates/actors/droid/v2/droid-sheet.hbs`).
 *
 * Goals:
 *   - Move panel-shaped data construction out of `droid-sheet.js`'s monolithic
 *     `_prepareContext` so the live droid sheet has the same builder seam the
 *     character sheet has.
 *   - Preserve EVERY context key the live template + its partials currently
 *     consume. This is a structural transplant, not a refactor of payloads.
 *   - Keep droid-specific divergences intact: no CON gating, no force/UTF
 *     panels, no follower slots, no multiclass progression. Droid-only data
 *     (heuristic processors, locomotion, integrated systems, protocols,
 *     programming, customizations, build history, modification points) is
 *     surfaced explicitly so consumers — and tests — can find it.
 *
 * NOT in this pass:
 *   - Per-panel template registration (the live droid sheet still renders a
 *     single monolithic template).
 *   - Per-panel validation enforcement (DroidLivePanelRegistry only flags
 *     drift, it does not throw).
 */

import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { isXPEnabled } from "/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js";
import { DroidValidationEngine } from "/systems/foundryvtt-swse/scripts/engine/droid-validation-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const ITEM_PROJECTION_KEYS = ["id", "name", "type", "img", "system"];

function projectItem(item) {
  const projection = {};
  for (const key of ITEM_PROJECTION_KEYS) projection[key] = item?.[key];
  return projection;
}

function projectItems(items) {
  return Array.isArray(items) ? items.map(projectItem) : [];
}

export class DroidSheetContextBuilder {
  constructor(actor) {
    this.actor = actor;
    this.system = actor?.system ?? {};
    this.derived = actor?.system?.derived ?? {};
  }

  /**
   * Build the full overrides object the live droid template + its partials
   * expect. Preserves the exact keyset previously assembled inline in
   * `SWSEV2DroidSheet._prepareContext`.
   *
   * @returns {object} overrides to be merged with super._prepareContext output
   */
  build() {
    const ownedActorMap = this.buildOwnedActorMap();
    const equipment = this.buildEquipmentEntries();
    const armor = this.buildArmorEntries();
    const weapons = this.buildWeaponEntries();
    const xp = this.buildXpDisplay();
    const abilityCards = this.buildAbilityCardLists();
    const droidPanels = this.buildDroidSpecificPanels();

    return {
      // NOTE: the 'actor' Document is intentionally NOT included; consumers use
      // `document` from the base context.
      system: this.system,
      derived: this.derived,
      xpEnabled: xp.xpEnabled,
      xpData: xp.xpData,
      xpPercent: xp.xpPercent,
      isGM: xp.isGM,
      items: projectItems(this.actor?.items),
      equipment,
      armor,
      weapons,
      ownedActorMap,
      feats: abilityCards.feats,
      talents: abilityCards.talents,
      racialAbilities: abilityCards.racialAbilities,
      droidPanels,
      user: {
        id: game.user?.id,
        name: game.user?.name,
        role: game.user?.role
      }
    };
  }

  /**
   * Build a serializable map of relationship/owned actors. Only stores
   * primitive fields — Document refs are not safe to serialize into the
   * Handlebars context.
   */
  buildOwnedActorMap() {
    const map = {};
    for (const entry of this.system?.ownedActors ?? []) {
      const ownedActor = game.actors?.get?.(entry.id);
      if (!ownedActor) continue;
      map[entry.id] = {
        id: ownedActor.id,
        name: ownedActor.name,
        type: ownedActor.type,
        img: ownedActor.img
      };
    }
    return map;
  }

  buildEquipmentEntries() {
    return projectItems((this.actor?.items ?? []).filter((item) => item.type === "equipment"));
  }

  buildArmorEntries() {
    return projectItems((this.actor?.items ?? []).filter((item) => item.type === "armor"));
  }

  buildWeaponEntries() {
    return projectItems((this.actor?.items ?? []).filter((item) => item.type === "weapon"));
  }

  buildXpDisplay() {
    const xpEnabled = isXPEnabled();
    const xpData = this.derived?.xp ?? null;
    const xpPercent = xpData?.progressPercent ?? 0;
    const isGM = game.user?.isGM === true;
    return { xpEnabled, xpData, xpPercent, isGM };
  }

  /**
   * Splits the AbilityEngine card-panel model into the three buckets the
   * existing template code expects. Failure here is non-fatal: empty arrays
   * preserve render stability.
   */
  buildAbilityCardLists() {
    let feats = [];
    let talents = [];
    let racialAbilities = [];
    try {
      const abilityPanel = AbilityEngine.getCardPanelModelForActor(this.actor);
      const all = abilityPanel?.all ?? [];
      feats = all.filter((a) => a.type === "feat");
      talents = all.filter((a) => a.type === "talent");
      racialAbilities = all.filter((a) => a.type === "racialAbility");
    } catch (err) {
      SWSELogger.error("SWSE | DroidSheetContextBuilder ability card panel failed", {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        error: err?.message
      });
    }
    return { feats, talents, racialAbilities };
  }

  /**
   * Surface droid-specific data in a panel-shaped form so future template
   * partials and parity tests can consume a stable contract without forcing
   * character-only fields onto droids.
   *
   * These payloads are additive — they do not replace any existing keys the
   * monolithic template already binds.
   */
  buildDroidSpecificPanels() {
    return {
      droidSummary: this.buildDroidSummaryPanel(),
      heuristicProcessors: this.buildHeuristicProcessorsPanel(),
      locomotion: this.buildLocomotionPanel(),
      processor: this.buildProcessorPanel(),
      armor: this.buildArmorPanel(),
      appendages: this.buildAppendagesPanel(),
      sensors: this.buildSensorsPanel(),
      integratedWeapons: this.buildIntegratedWeaponsPanel(),
      integratedSystems: this.buildIntegratedSystemsPanel(),
      budgetBreakdown: this.buildBudgetBreakdownPanel(),
      protocols: this.buildProtocolsPanel(),
      programming: this.buildProgrammingPanel(),
      customizations: this.buildCustomizationsPanel(),
      buildHistory: this.buildBuildHistoryPanel(),
      configurationMetrics: this.buildConfigurationMetricsPanel(),
      // Phase 3A: Real validation/readiness diagnostics
      validation: this.buildValidationPanel()
    };
  }

  buildDroidSummaryPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const creditsSpent = Number(droidSystems.credits?.spent ?? 0);
    const creditsTotal = Number(droidSystems.credits?.total ?? 0);
    const creditsRemaining = creditsTotal - creditsSpent;
    const isOverBudget = creditsSpent > creditsTotal;

    // Readiness: check if droid has all required components
    const validation = DroidValidationEngine.validateDroidConfiguration(droidSystems);
    const isReady = validation.valid && !isOverBudget;

    return {
      droidType: this.system?.droidType ?? "",
      droidModel: this.system?.droidModel ?? "",
      restrictionLevel: Number(this.system?.restrictionLevel ?? 0),
      maxModificationPoints: this._calculateMaxModPoints(),
      usedModificationPoints: this._calculateUsedModPoints(),
      availableModificationPoints: this._calculateAvailableModPoints(),
      canEdit: this.actor?.isOwner === true,
      // Phase 1: Project core droidSystems summary for backwards-compatible template migration
      degree: droidSystems.degree ?? "",
      size: droidSystems.size ?? "",
      stateMode: droidSystems.stateMode ?? "",
      creditsSpent,
      creditsTotal,
      // Phase 3A: Real budget diagnostics
      creditsRemaining,
      isOverBudget,
      budgetStatus: isOverBudget ? "OVER_BUDGET" : (creditsSpent === 0 ? "EMPTY" : "IN_BUDGET"),
      readinessStatus: isReady ? "READY" : (validation.valid ? "OVER_BUDGET" : "INCOMPLETE"),
      isReady
    };
  }

  buildHeuristicProcessorsPanel() {
    const entries = (this.actor?.items ?? [])
      .filter((item) => item.type === "heuristicProcessor")
      .map((item) => ({
        id: item.id,
        name: item.name,
        rating: item.system?.rating ?? null,
        description: item.system?.description ?? ""
      }));
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: "No heuristic processors installed"
    };
  }

  buildLocomotionPanel() {
    const locomotion = this.system?.locomotion ?? {};
    const droidSystems = this.system?.droidSystems ?? {};
    return {
      type: locomotion.type ?? "",
      speed: Number(locomotion.speed ?? 0),
      notes: locomotion.notes ?? "",
      // Phase 1: Project name from droidSystems for backwards-compatible template migration
      name: droidSystems.locomotion?.name ?? ""
    };
  }

  buildProcessorPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const processor = droidSystems.processor ?? {};
    return {
      id: processor.id ?? "",
      name: processor.name ?? "",
      cost: Number(processor.cost ?? 0),
      bonus: Number(processor.bonus ?? 0),
      description: processor.description ?? "",
      hasProcessor: Boolean(processor.id),
      emptyMessage: "No processor configured"
    };
  }

  buildArmorPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const armor = droidSystems.armor ?? {};
    return {
      id: armor.id ?? "",
      name: armor.name ?? "",
      cost: Number(armor.cost ?? 0),
      bonus: Number(armor.bonus ?? 0),
      description: armor.description ?? "",
      hasArmor: Boolean(armor.id),
      emptyMessage: "No armor configured"
    };
  }

  buildAppendagesPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const entries = Array.isArray(droidSystems.appendages)
      ? droidSystems.appendages.map((item, idx) => ({
          id: item.id ?? `appendage-${idx}`,
          name: item.name ?? "",
          cost: Number(item.cost ?? 0),
          description: item.description ?? ""
        }))
      : [];
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      emptyMessage: "No appendages configured"
    };
  }

  buildSensorsPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const entries = Array.isArray(droidSystems.sensors)
      ? droidSystems.sensors.map((item, idx) => ({
          id: item.id ?? `sensor-${idx}`,
          name: item.name ?? "",
          cost: Number(item.cost ?? 0),
          range: item.range ?? "",
          description: item.description ?? ""
        }))
      : [];
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      emptyMessage: "No sensors configured"
    };
  }

  buildIntegratedWeaponsPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const entries = Array.isArray(droidSystems.weapons)
      ? droidSystems.weapons.map((item, idx) => ({
          id: item.id ?? `weapon-${idx}`,
          name: item.name ?? "",
          cost: Number(item.cost ?? 0),
          type: item.type ?? "built-in",
          description: item.description ?? ""
        }))
      : [];
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      emptyMessage: "No integrated weapons configured"
    };
  }

  buildIntegratedSystemsPanel() {
    const entries = (this.actor?.items ?? [])
      .filter((item) => item.type === "integratedSystem" || item.system?.integrated === true)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.system?.description ?? ""
      }));
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: "No integrated systems installed"
    };
  }

  buildProtocolsPanel() {
    const entries = (this.actor?.items ?? [])
      .filter((item) => item.type === "protocol")
      .map((item) => ({
        id: item.id,
        name: item.name,
        affectedSkill: item.system?.affectedSkill ?? "",
        bonus: Number(item.system?.bonus ?? 0),
        description: item.system?.description ?? ""
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: "No protocols installed"
    };
  }

  buildProgrammingPanel() {
    const entries = (this.actor?.items ?? [])
      .filter((item) => item.type === "programming" || item.type === "language")
      .map((item) => ({
        id: item.id,
        name: item.name,
        proficiency: item.system?.proficiency ?? "speaks"
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: "No programming languages installed"
    };
  }

  buildCustomizationsPanel() {
    const entries = (this.actor?.items ?? [])
      .filter((item) => item.type === "customization")
      .map((item) => ({
        id: item.id,
        name: item.name,
        costPoints: Number(item.system?.costPoints ?? 1),
        prerequisite: item.system?.prerequisite ?? null,
        description: item.system?.description ?? ""
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const totalCost = entries.reduce((sum, entry) => sum + entry.costPoints, 0);
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost,
      availablePoints: this._calculateAvailableModPoints(),
      emptyMessage: "No customizations installed"
    };
  }

  buildBuildHistoryPanel() {
    const history = Array.isArray(this.system?.buildHistory) ? this.system.buildHistory : [];
    const entries = history.map((event, idx) => ({
      id: event?.id ?? `build-${idx}`,
      timestamp: event?.timestamp ?? null,
      summary: event?.summary ?? "",
      actor: event?.actor ?? null,
      // Phase 1: Project full entry structure for template backwards-compatibility
      action: event?.action ?? "",
      mode: event?.mode ?? "",
      costDelta: event?.costDelta ?? 0,
      detail: event?.detail ?? ""
    }));
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: "No build history recorded"
    };
  }

  buildConfigurationMetricsPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    return {
      // Phase 1: Project simple counts and names for template backwards-compatibility
      // These will eventually be replaced with richer subsystem panels
      processorName: droidSystems.processor?.name ?? "",
      armorName: droidSystems.armor?.name ?? "",
      appendagesCount: Array.isArray(droidSystems.appendages) ? droidSystems.appendages.length : 0,
      sensorsCount: Array.isArray(droidSystems.sensors) ? droidSystems.sensors.length : 0,
      weaponsCount: Array.isArray(droidSystems.weapons) ? droidSystems.weapons.length : 0,
      accessoriesCount: Array.isArray(droidSystems.accessories) ? droidSystems.accessories.length : 0
    };
  }

  buildValidationPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const creditsSpent = Number(droidSystems.credits?.spent ?? 0);
    const creditsTotal = Number(droidSystems.credits?.total ?? 0);
    const isOverBudget = creditsSpent > creditsTotal;

    // Use DroidValidationEngine for configuration validation
    const validation = DroidValidationEngine.validateDroidConfiguration(droidSystems);

    // Build issues list
    const issues = [];
    if (!validation.valid) {
      issues.push(...validation.errors.map((error, idx) => ({
        id: `validation-${idx}`,
        type: "missing",
        severity: "error",
        message: error
      })));
    }

    // Add budget issue if over-budget
    if (isOverBudget) {
      const overage = creditsSpent - creditsTotal;
      issues.push({
        id: "budget-overage",
        type: "over_budget",
        severity: "error",
        message: `Configuration exceeds budget by ${overage} credits`
      });
    }

    // Determine overall readiness
    const hasIssues = issues.length > 0;
    const isReady = validation.valid && !isOverBudget;

    return {
      state: droidSystems.stateMode ?? "NEW",
      isReady,
      isValid: validation.valid,
      isOverBudget,
      issues,
      hasIssues,
      issueCount: issues.length,
      warnings: isOverBudget && !validation.valid ? [
        "Configuration is incomplete and over-budget"
      ] : isOverBudget ? [
        "Configuration exceeds budget"
      ] : !validation.valid ? [
        "Configuration is incomplete"
      ] : [],
      hasWarnings: (isOverBudget || !validation.valid),
      // User-facing status summary
      statusLabel: isReady ? "Ready to Finalize" : (validation.valid ? "Over Budget" : "Incomplete Configuration"),
      allClearMessage: !hasIssues ? "Configuration is valid and within budget" : null
    };
  }

  buildBudgetBreakdownPanel() {
    const droidSystems = this.system?.droidSystems ?? {};
    const creditsSpent = Number(droidSystems.credits?.spent ?? 0);
    const creditsTotal = Number(droidSystems.credits?.total ?? 0);
    const creditsRemaining = creditsTotal - creditsSpent;
    const isOverBudget = creditsSpent > creditsTotal;

    // Build category breakdown from subsystem contracts
    const locomotionCost = Number(droidSystems.locomotion?.cost ?? 0);
    const processorCost = Number(droidSystems.processor?.cost ?? 0);
    const armorCost = Number(droidSystems.armor?.cost ?? 0);

    const appendagesCost = Array.isArray(droidSystems.appendages)
      ? droidSystems.appendages.reduce((sum, a) => sum + Number(a.cost ?? 0), 0)
      : 0;
    const appendagesCount = Array.isArray(droidSystems.appendages) ? droidSystems.appendages.length : 0;

    const sensorsCost = Array.isArray(droidSystems.sensors)
      ? droidSystems.sensors.reduce((sum, s) => sum + Number(s.cost ?? 0), 0)
      : 0;
    const sensorsCount = Array.isArray(droidSystems.sensors) ? droidSystems.sensors.length : 0;

    const weaponsCost = Array.isArray(droidSystems.weapons)
      ? droidSystems.weapons.reduce((sum, w) => sum + Number(w.cost ?? 0), 0)
      : 0;
    const weaponsCount = Array.isArray(droidSystems.weapons) ? droidSystems.weapons.length : 0;

    const accessoriesCost = Array.isArray(droidSystems.accessories)
      ? droidSystems.accessories.reduce((sum, a) => sum + Number(a.cost ?? 0), 0)
      : 0;
    const accessoriesCount = Array.isArray(droidSystems.accessories) ? droidSystems.accessories.length : 0;

    // Build categories array, omitting zero-cost items to avoid clutter
    const categories = [];

    if (locomotionCost > 0) {
      categories.push({
        key: 'locomotion',
        label: 'Locomotion',
        cost: locomotionCost,
        count: 1,
        percent: Math.round((locomotionCost / creditsSpent) * 100) || 0
      });
    }

    if (processorCost > 0) {
      categories.push({
        key: 'processor',
        label: 'Processor',
        cost: processorCost,
        count: 1,
        percent: Math.round((processorCost / creditsSpent) * 100) || 0
      });
    }

    if (armorCost > 0) {
      categories.push({
        key: 'armor',
        label: 'Armor',
        cost: armorCost,
        count: 1,
        percent: Math.round((armorCost / creditsSpent) * 100) || 0
      });
    }

    if (appendagesCost > 0) {
      categories.push({
        key: 'appendages',
        label: 'Appendages',
        cost: appendagesCost,
        count: appendagesCount,
        percent: Math.round((appendagesCost / creditsSpent) * 100) || 0
      });
    }

    if (sensorsCost > 0) {
      categories.push({
        key: 'sensors',
        label: 'Sensors',
        cost: sensorsCost,
        count: sensorsCount,
        percent: Math.round((sensorsCost / creditsSpent) * 100) || 0
      });
    }

    if (weaponsCost > 0) {
      categories.push({
        key: 'weapons',
        label: 'Integrated Weapons',
        cost: weaponsCost,
        count: weaponsCount,
        percent: Math.round((weaponsCost / creditsSpent) * 100) || 0
      });
    }

    if (accessoriesCost > 0) {
      categories.push({
        key: 'accessories',
        label: 'Accessories',
        cost: accessoriesCost,
        count: accessoriesCount,
        percent: Math.round((accessoriesCost / creditsSpent) * 100) || 0
      });
    }

    // Identify largest cost driver
    let largestKey = null;
    if (categories.length > 0) {
      const largest = categories.reduce((max, cat) => cat.cost > max.cost ? cat : max);
      largestKey = largest.key;
    }

    // Add isLargest flag to each category
    categories.forEach(cat => {
      cat.isLargest = cat.key === largestKey;
    });

    return {
      totalSpent: creditsSpent,
      totalBudget: creditsTotal,
      remaining: creditsRemaining,
      isOverBudget,
      categories,
      hasCategories: categories.length > 0,
      largestDriver: largestKey,
      emptyMessage: "No budget allocated yet"
    };
  }

  /* ---------------- Droid game logic helpers ---------------- */

  _calculateMaxModPoints() {
    const intMod = Number(this.system?.abilities?.int?.mod ?? this.system?.abilities?.intelligence?.modifier ?? 0);
    const level = Number(this.system?.level ?? 1);
    return Math.floor((intMod * 3) + (level / 2));
  }

  _calculateUsedModPoints() {
    return (this.actor?.items ?? [])
      .filter((item) => item.type === "customization")
      .reduce((sum, item) => sum + Number(item.system?.costPoints ?? 1), 0);
  }

  _calculateAvailableModPoints() {
    return this._calculateMaxModPoints() - this._calculateUsedModPoints();
  }
}
