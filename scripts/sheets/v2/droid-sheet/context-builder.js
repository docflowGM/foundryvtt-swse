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
import { PanelContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js";
import { buildHeaderHpSegments } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/context.js";
import { XP_LEVEL_THRESHOLDS } from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";
import { DroidSystemsResolver } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/droid-systems-resolver.js";
import { buildUnarmedAttackContext } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";

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
    this.panelBuilder = new PanelContextBuilder(actor, { isEditable: actor?.isOwner === true });
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
    const abilityCards = this.buildAbilityCardLists();
    const droidPanels = this.buildDroidSpecificPanels();

    const biographyPanel = this.buildBiographyPanel();
    const healthPanel = this.panelBuilder.buildHealthPanel();
    const defensePanel = this.panelBuilder.buildDefensePanel();
    const secondWindPanel = this.panelBuilder.buildSecondWindPanel();
    const abilitiesPanel = this.buildAbilitiesPanel();
    const abilities = abilitiesPanel.abilities;
    const derived = this.buildDerivedViewModel(abilities);
    const header = this.buildHeaderViewModel();

    // Phase 3: structured top-level droid context (pure derivation, no actor writes)
    const degree = this.buildDegreeNormalization();
    const requiredSystems = this.buildRequiredSystemsDefaults(droidPanels);
    const garage = this.buildGarageContext();
    const flags = this.buildFlagsContext();

    // Phase 4+: resolver unifies builder data + item collection into per-region view
    const resolvedSystems = this.buildResolvedSystems();
    this.applyResolvedSystemPanels(droidPanels, resolvedSystems);

    // Phase 7: build provenance + missing-systems status card context
    const sourceStatus = this.buildSourceStatus(resolvedSystems);

    // Phase 6+: split weapons into combat-classified buckets and always expose unarmed
    const combatWeapons = this.buildCombatWeaponsContext(weapons, resolvedSystems);

    return {
      // NOTE: the 'actor' Document is intentionally NOT included; consumers use
      // `document` from the base context.
      system: this.system,
      derived,
      biographyPanel,
      healthPanel,
      defensePanel,
      abilitiesPanel,
      abilities,
      xpEnabled: header.xpEnabled,
      xpData: header.xpData,
      xpPercent: header.xpPercent,
      xpLevelReady: header.xpLevelReady,
      isGM: header.isGM,
      headerHpSegments: header.headerHpSegments,
      headerXpSegments: header.headerXpSegments,
      forcePointsValue: header.forcePointsValue,
      forcePointsMax: header.forcePointsMax,
      destinyPointsValue: header.destinyPointsValue,
      destinyPointsMax: header.destinyPointsMax,
      secondWindPanel,
      items: projectItems(this.actor?.items),
      equipment,
      armor,
      weapons,
      combatWeapons,
      ownedActorMap,
      feats: abilityCards.feats,
      talents: abilityCards.talents,
      racialAbilities: abilityCards.racialAbilities,
      droidPanels,
      droid: {
        degree,
        layoutMode: degree.layoutMode,
        systems: droidPanels,
        requiredSystems,
        resolvedSystems,
        garage,
        flags,
        sourceStatus
      },
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

  buildBiographyPanel() {
    const panel = this.panelBuilder.buildBiographyPanel();
    panel.identity = {
      ...panel.identity,
      class: 'Droid',
      species: this.system?.droidType || panel.identity.species,
      profession: this.system?.droidModel || panel.identity.profession,
      homeworld: this.system?.manufacturer || panel.identity.homeworld
    };
    return panel;
  }

  buildAbilitiesPanel() {
    const panel = this.panelBuilder.buildAbilitiesPanel();
    panel.abilities = panel.abilities.filter((ability) => ability.key !== 'con');
    return panel;
  }

  buildDerivedViewModel(abilities) {
    const derived = foundry.utils.deepClone(this.derived ?? {});
    derived.identity ??= {};
    derived.identity.abilities = abilities.map((ability) => ({
      key: ability.key,
      label: ability.label,
      value: ability.total,
      mod: ability.mod
    }));
    return derived;
  }

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
    return (this.actor?.items ?? [])
      .filter(item => item.type === "weapon")
      .map(item => {
        const isIntegrated =
          item.system?.integrated === true || Boolean(item.flags?.swse?.integrated);
        return {
          ...projectItem(item),
          isIntegrated,
          // Phase 6: surfaced weapon metadata (read-only, no mutation)
          damage: item.system?.damage ?? "",
          damageBonus: item.system?.damageBonus ?? "",
          attackBonus: Number.isFinite(Number(item.system?.attackBonus))
            ? Number(item.system.attackBonus) : null,
          range: item.system?.range ?? "",
          meleeOrRanged: item.system?.meleeOrRanged ?? "melee",
          equipped: item.system?.equipped === true,
        };
      });
  }

  applyResolvedSystemPanels(droidPanels, resolvedSystems) {
    const toPanel = (region, emptyMessage = 'No systems configured') => {
      const entries = (region?.items ?? []).map(item => ({
        ...item,
        cost: Number(item.cost ?? 0),
        description: item.description ?? '',
        damage: item.damage ?? item.weaponProfile?.damage ?? '',
        range: item.range ?? item.weaponProfile?.range ?? '',
        attackBonus: item.attackBonus ?? item.weaponProfile?.attackBonus ?? null,
        canRoll: item.canRoll === true || Boolean(item.weaponProfile),
        isSelfDestruct: item.isSelfDestruct === true || item.weaponProfile?.selfDestruct === true
      }));
      return {
        entries,
        items: entries,
        hasEntries: entries.length > 0,
        totalCount: entries.length,
        totalCost: entries.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0),
        emptyMessage,
        warning: region?.warning ?? null,
        slots: region?.slots ?? [],
        processorSlots: region?.processorSlots ?? [],
        skillModifiers: region?.skillModifiers ?? []
      };
    };

    droidPanels.processor = {
      ...droidPanels.processor,
      ...toPanel(resolvedSystems.processor, 'No processor configured'),
      hasProcessor: resolvedSystems.processor?.isConfigured === true,
      name: resolvedSystems.processor?.primary?.name ?? droidPanels.processor?.name ?? '',
      description: resolvedSystems.processor?.primary?.description ?? droidPanels.processor?.description ?? '',
      hasBackupProcessorSlot: resolvedSystems.processor?.hasBackupProcessorSlot === true,
      processorSlots: resolvedSystems.processor?.processorSlots ?? []
    };
    droidPanels.locomotion = {
      ...droidPanels.locomotion,
      ...toPanel(resolvedSystems.locomotion, 'No locomotion configured'),
      name: resolvedSystems.locomotion?.active?.name ?? resolvedSystems.locomotion?.name ?? droidPanels.locomotion?.name ?? '',
      speed: resolvedSystems.locomotion?.speed ?? droidPanels.locomotion?.speed ?? 0
    };
    droidPanels.appendages = {
      ...droidPanels.appendages,
      ...toPanel(resolvedSystems.appendages, 'No appendages configured'),
      totalCount: resolvedSystems.appendages?.items?.length ?? 0,
      unarmedAttack: resolvedSystems.appendages?.unarmedAttack ?? buildUnarmedAttackContext(this.actor)
    };
    droidPanels.armor = { ...droidPanels.armor, ...toPanel(resolvedSystems.armor, 'No armor configured'), hasArmor: resolvedSystems.armor?.isConfigured === true };
    droidPanels.sensors = { ...droidPanels.sensors, ...toPanel(resolvedSystems.sensors, 'No sensors configured') };
    droidPanels.integratedWeapons = { ...droidPanels.integratedWeapons, ...toPanel(resolvedSystems.integratedWeapons, 'No integrated weapons configured') };
    droidPanels.integratedSystems = { ...droidPanels.integratedSystems, ...toPanel(resolvedSystems.integratedEquipment, 'No integrated systems installed') };
    droidPanels.skillModifiers = resolvedSystems.skillModifiers ?? [];
  }

  buildCombatWeaponsContext(weapons, resolvedSystems = null) {
    const handheld = weapons.filter(w => !w.isIntegrated);
    const integrated = weapons.filter(w => w.isIntegrated);
    const integratedParts = resolvedSystems?.integratedWeapons?.items
      ?.filter(part => part.weaponProfile && !integrated.some(w => w.id === part.id)) ?? [];
    const unarmed = buildUnarmedAttackContext(this.actor);
    return {
      handheld,
      integrated,
      integratedParts,
      unarmed,
      all: [unarmed, ...weapons, ...integratedParts],
      hasHandheld: handheld.length > 0,
      hasIntegrated: integrated.length > 0,
      hasIntegratedParts: integratedParts.length > 0,
      hasAny: true,
    };
  }

  buildHeaderViewModel() {
    const xpEnabled = isXPEnabled();
    const xpDerived = this.derived?.xp ?? { total: 0, progressPercent: 0, xpToNext: 0, level: this.system?.level ?? 1 };
    const xpDisplayLevel = Math.max(1, Number(this.system?.level ?? xpDerived.level ?? 1));
    const xpTotal = Number(xpDerived.total ?? this.system?.xp?.total ?? 0) || 0;
    const xpPercent = Math.max(0, Math.min(100, Math.round(Number(xpDerived.progressPercent ?? 0) || 0)));
    const nextLevelAtDisplay = XP_LEVEL_THRESHOLDS[Math.min(20, xpDisplayLevel + 1)] ?? null;
    const xpLevelReady = xpPercent >= 100;
    const xpData = {
      level: xpDisplayLevel,
      total: xpTotal,
      nextLevelAt: nextLevelAtDisplay,
      xpToNext: nextLevelAtDisplay !== null ? Math.max(0, nextLevelAtDisplay - xpTotal) : 0,
      percentRounded: xpPercent,
      stateClass: xpLevelReady ? 'state--ready-levelup' : xpPercent >= 75 ? 'state--nearly-ready' : 'state--in-progress'
    };

    const headerHpSegments = buildHeaderHpSegments(this.actor);
    const xpFilledSegments = Math.round((xpPercent / 100) * 20);
    const headerXpSegments = Array.from({ length: 20 }, (_, index) => ({
      filled: index < xpFilledSegments
    }));

    return {
      xpEnabled,
      xpData,
      xpPercent,
      xpLevelReady,
      isGM: game.user?.isGM === true,
      headerHpSegments,
      headerXpSegments,
      forcePointsValue: Number(this.system?.forcePoints?.value ?? 0) || 0,
      forcePointsMax: Number(this.system?.forcePoints?.max ?? 0) || 0,
      destinyPointsValue: Number(this.system?.destinyPoints?.value ?? 0) || 0,
      destinyPointsMax: Number(this.system?.destinyPoints?.max ?? 0) || 0
    };
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
      validation: this.buildValidationPanel(),
      // Phase 3B: Stock droid provenance
      stockImport: this.actor?.flags?.swse?.stockDroidImport,
      stockConversion: this.actor?.flags?.swse?.stockDroidConversionReport
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
    const builderEntries = Array.isArray(droidSystems.weapons)
      ? droidSystems.weapons.map((item, idx) => ({
          id: item.id ?? `weapon-${idx}`,
          name: item.name ?? "",
          cost: Number(item.cost ?? 0),
          type: item.type ?? "built-in",
          description: item.description ?? ""
        }))
      : [];

    // Also include weapon items from actor.items that carry the integrated flag
    const builderIds = new Set(builderEntries.map(e => e.id).filter(Boolean));
    const itemEntries = (this.actor?.items ?? [])
      .filter(i =>
        i.type === "weapon" &&
        (i.system?.integrated === true || Boolean(i.flags?.swse?.integrated)) &&
        !builderIds.has(i.id)
      )
      .map(i => ({
        id: i.id,
        name: i.name ?? "",
        cost: 0,
        type: "built-in",
        description: i.system?.description ?? "",
        // Phase 6: weapon metadata for Systems tab display
        damage: i.system?.damage ?? "",
        damageBonus: i.system?.damageBonus ?? "",
        range: i.system?.range ?? "",
        meleeOrRanged: i.system?.meleeOrRanged ?? "melee",
        attackBonus: Number.isFinite(Number(i.system?.attackBonus))
          ? Number(i.system.attackBonus) : null,
        canRoll: true,
      }));

    const entries = [...builderEntries, ...itemEntries];
    return {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      emptyMessage: "No integrated weapons configured"
    };
  }

  buildIntegratedSystemsPanel() {
    // Excludes weapon items — those go in integratedWeapons, not here
    const entries = (this.actor?.items ?? [])
      .filter((item) =>
        item.type !== "weapon" &&
        (item.type === "integratedSystem" || item.system?.integrated === true || Boolean(item.flags?.swse?.integrated))
      )
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

  /* ---------------- Phase 3: structured droid context builders ---------------- */

  buildDegreeNormalization() {
    const DEGREE_MAP = {
      1: { label: "1st Degree", category: "Medical", ordinal: "1st", layoutMode: "medical" },
      2: { label: "2nd Degree", category: "Technical", ordinal: "2nd", layoutMode: "technical" },
      3: { label: "3rd Degree", category: "Social/Protocol", ordinal: "3rd", layoutMode: "social" },
      4: { label: "4th Degree", category: "Security/Military", ordinal: "4th", layoutMode: "military" },
      5: { label: "5th Degree", category: "Labor", ordinal: "5th", layoutMode: "labor" }
    };

    const raw = this.system?.droidSystems?.degree ?? "";
    // Accept numeric (1) or ordinal string ("1st", "2nd") from actor data
    const numericValue = Number(String(raw).replace(/\D/g, "")) || 0;
    const entry = DEGREE_MAP[numericValue] ?? null;

    return {
      value: numericValue || null,
      raw,
      label: entry?.label ?? "",
      category: entry?.category ?? "",
      ordinal: entry?.ordinal ?? "",
      layoutMode: entry?.layoutMode ?? "default",
      isConfigured: numericValue > 0
    };
  }

  buildRequiredSystemsDefaults(droidPanels) {
    const processorConfigured = droidPanels.processor.hasProcessor;
    const locomotionConfigured = Boolean(droidPanels.locomotion.name);
    const appendagesConfigured = droidPanels.appendages.hasEntries;
    return {
      processor: {
        isConfigured: processorConfigured,
        isDefault: !processorConfigured,
        defaultName: "Heuristic Processor",
        defaultLabel: "Type"
      },
      locomotion: {
        isConfigured: locomotionConfigured,
        isDefault: !locomotionConfigured,
        defaultName: "Walking",
        defaultLabel: "Type"
      },
      appendages: {
        isConfigured: appendagesConfigured,
        isDefault: !appendagesConfigured,
        defaultName: "2 × Standard Droid Arms",
        defaultLabel: "Manipulators"
      }
    };
  }

  buildResolvedSystems() {
    return new DroidSystemsResolver(this.actor).resolve();
  }

  /**
   * Phase 7: Classify build provenance and surface missing-system warnings.
   * Receives already-resolved systems to avoid a second DroidSystemsResolver pass.
   * Pure read — no actor mutations.
   */
  buildSourceStatus(resolvedSystems) {
    const swseFlags = this.actor?.flags?.swse ?? {};
    const droidSystems = this.system?.droidSystems ?? {};
    const level = Number(this.system?.level ?? 0);
    const isOwner = this.actor?.isOwner === true;

    const isStockDroid = Boolean(swseFlags.stockDroidImport);
    const hasConversionReport = Boolean(swseFlags.stockDroidConversionReport);
    const hasConfiguration = Boolean(droidSystems.degree);
    const stateMode = droidSystems.stateMode ?? 'NEW';
    const isFinalized = stateMode === 'FINALIZED';

    // Source classification — order matters: conversion > import > configured > legacy > manual
    let buildSource;
    if (hasConversionReport) {
      buildSource = 'converted';
    } else if (isStockDroid) {
      buildSource = 'imported';
    } else if (hasConfiguration) {
      buildSource = 'garage-built';
    } else if (level > 0) {
      buildSource = 'legacy';
    } else {
      buildSource = 'manual';
    }

    const SOURCE_LABELS = {
      'converted': 'Converted Stock Droid',
      'imported': 'Stock Droid Import',
      'garage-built': 'Custom Build',
      'legacy': 'Legacy / Pre-Builder',
      'manual': 'Unconfigured',
    };

    // Missing required-system warnings derived from already-resolved data
    const validationMessages = [];
    if (!resolvedSystems.processor.isConfigured) {
      validationMessages.push({ severity: 'warning', text: 'No processor configured — baseline default applied' });
    }
    if (!resolvedSystems.locomotion.isConfigured) {
      validationMessages.push({ severity: 'warning', text: 'No locomotion system configured — walking assumed' });
    }
    if (!resolvedSystems.appendages.isConfigured) {
      validationMessages.push({ severity: 'warning', text: 'No appendages configured — standard droid arms assumed' });
    }
    if (!hasConfiguration) {
      validationMessages.push({ severity: 'info', text: 'Droid degree not set — affects trained skills and ability bonuses' });
    }

    const garageRecommended =
      isOwner &&
      !isFinalized &&
      (validationMessages.length > 0 || buildSource === 'legacy' || buildSource === 'manual');

    return {
      buildSource,
      sourceLabel: SOURCE_LABELS[buildSource] ?? 'Unknown',
      isChargenBuilt: buildSource === 'garage-built',
      isImported: isStockDroid,
      isConverted: hasConversionReport,
      isManualOrLegacy: buildSource === 'manual' || buildSource === 'legacy',
      isFinalized,
      garageRecommended,
      hasConfiguration,
      importedFrom: swseFlags.stockDroidImport?.sourceName ?? null,
      convertedFrom: swseFlags.stockDroidConversionReport?.sourceName ?? null,
      validationMessages,
      hasValidationMessages: validationMessages.length > 0,
    };
  }

  buildGarageContext() {
    const isOwner = this.actor?.isOwner === true;
    const droidSystems = this.system?.droidSystems ?? {};
    const hasConfiguration = Boolean(droidSystems.degree);
    const isStock = Boolean(this.actor?.flags?.swse?.stockDroidImport);

    // Phase 5: lock detection — canonical flag is stateMode === 'FINALIZED'
    const isFinalized = droidSystems.stateMode === 'FINALIZED';
    // Safe heroic fallback: droids in play (level > 0) with a builder config
    // show systems as managed-through-Garage even if not yet finalized.
    const isInPlay = Number(this.system?.level ?? 0) > 0 && hasConfiguration;
    const systemsLocked = isFinalized || isInPlay;
    const lockReason = isFinalized
      ? 'Configuration finalized — edit via Garage'
      : isInPlay ? 'Systems managed through Garage' : null;

    return {
      canEdit: isOwner,
      canCustomize: isOwner && hasConfiguration,
      canConvert: isOwner && isStock,
      openMode: hasConfiguration ? 'EDIT' : 'NEW',
      hasConfiguration,
      // Phase 5
      systemsLocked,
      isFinalized,
      lockReason,
      canOpenGarage: isOwner,
      canManageSystems: isOwner,
    };
  }

  buildFlagsContext() {
    const swseFlags = this.actor?.flags?.swse ?? {};
    return {
      isStockDroid: Boolean(swseFlags.stockDroidImport),
      hasConversionReport: Boolean(swseFlags.stockDroidConversionReport),
      isPendingApproval: Boolean(swseFlags.pendingApproval)
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
