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
 *   - Move panel-shaped data construction out of `droid-sheet.js` so the
 *     live droid sheet has the same builder seam the character sheet has.
 *   - Preserve EVERY context key the live template + its partials currently
 *     consume. This is a structural transplant, not a refactor of payloads.
 *   - Keep droid-specific divergences intact: no CON gating, no force/UTF
 *     panels, no follower slots, no multiclass progression. Droid-only data
 *     (heuristic processors, locomotion, integrated systems, protocols,
 *     programming, customizations, build history, modification points) is
 *     surfaced explicitly so consumers — and tests — can find it.
 *
 * NOT in this pass:
 *   - A dynamic registry-driven renderer. The live droid sheet now composes
 *     explicit frame/tab partials inside the shared shell.
 *   - Per-panel validation enforcement (DroidLivePanelRegistry only flags
 *     drift, it does not throw).
 */

import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { DroidValidationEngine } from "/systems/foundryvtt-swse/scripts/engine/droid-validation-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DroidSystemsResolver } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/droid-systems-resolver.js";
import { buildUnarmedAttackContext } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { isDroidStatblockMode, resolveDroidCalculationMode, DROID_CALCULATION_MODE } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { getDroidPartDefinition, getAllDroidPartDefinitions, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { classifyStockSystemSources, annotateWeaponCandidatesAgainstExistingItems, RECONCILIATION_CLASSIFICATION } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-classifier.js";
import { DROID_SYSTEMS_SOURCE_FIELDS } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";

const ITEM_PROJECTION_KEYS = ["id", "name", "type", "img", "system"];

function projectItem(item) {
  const projection = {};
  for (const key of ITEM_PROJECTION_KEYS) projection[key] = item?.[key];
  const system = item?.system ?? {};
  const weaponProfile = readWeaponProfile(system);
  projection.damage = firstDefined(system.damage, system.damageFormula, weaponProfile?.damage, "");
  projection.damageType = firstDefined(system.damageType, system.damageTypes, weaponProfile?.damageType, "");
  projection.range = firstDefined(system.range, system.rangeText, weaponProfile?.range, weaponProfile?.mode, "");
  projection.attackBonus = firstDefined(system.attackBonus, system.attack, weaponProfile?.attackBonus, null);
  projection.weaponProfile = weaponProfile;
  projection.integrated = isTruthyState(system.integrated) || isTruthyState(item?.flags?.swse?.integrated);
  projection.equipped = isTruthyState(system.equipped)
    || isTruthyState(system.isEquipped)
    || isTruthyState(system.readied)
    || isTruthyState(system.active)
    || isTruthyState(system.equippable?.equipped)
    || projection.integrated;
  if (item?.type === "armor") {
    const armor = resolveArmorData(item);
    projection.armor = armor;
    projection.armorType = armor.armorType;
    projection.armorTypeLabel = armor.armorTypeLabel;
    projection.isEnergyShield = armor.isEnergyShield;
    projection.reflexBonus = armor.reflexBonus;
    projection.fortitudeBonus = armor.fortitudeBonus;
    projection.maxDexBonus = armor.maxDexBonus;
    projection.armorCheckPenalty = armor.armorCheckPenalty;
    projection.speedPenalty = armor.speedPenalty;
    projection.shieldRating = armor.shieldRating;
    projection.currentSR = armor.currentSR;
  }
  return projection;
}

function asItemArray(items) {
  if (Array.isArray(items)) return items;
  if (!items) return [];
  if (Array.isArray(items.contents)) return items.contents;
  if (typeof items.values === "function") return Array.from(items.values());
  if (typeof items[Symbol.iterator] === "function") return Array.from(items);
  if (typeof items === "object") return Object.values(items);
  return [];
}

function isTruthyState(value) {
  if (value === true || Number(value) === 1) return true;
  if (value && typeof value === "object") {
    return isTruthyState(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
  }
  return ["true", "1", "yes", "equipped", "worn", "held", "readied", "ready", "on", "active", "integrated"]
    .includes(String(value ?? "").toLowerCase());
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function readWeaponProfile(system = {}) {
  const profiles = Array.isArray(system.weaponProfiles) ? system.weaponProfiles : [];
  return system.weaponProfile ?? profiles[0] ?? null;
}

function projectItems(items) {
  return asItemArray(items).map(projectItem);
}

export class DroidSheetContextBuilder {
  /**
   * @param {SWSEActor} actor
   * @param {object} [options]
   * @param {boolean} [options.isEditable] - Authoritative sheet-presentation
   *   editability (the owning SWSEV2DroidSheet's real ApplicationV2
   *   `isEditable` getter — GM-aware, options.editable-aware, not raw
   *   ownership). Phase 7: replaces the builder's former internal guess
   *   (`actor?.isOwner === true`), which disagreed with the shared
   *   Character-like context path for a GM viewing a droid it does not
   *   personally own. See docs/audits/v2-phase-7-droid-context-convergence.md.
   */
  constructor(actor, { isEditable = false } = {}) {
    this.actor = actor;
    this.system = actor?.system ?? {};
    this.derived = actor?.system?.derived ?? {};
    this.isEditable = isEditable === true;
  }

  /**
   * Build the full overrides object the live droid template + its partials
   * expect. Preserves the exact keyset previously assembled inline in
   * `SWSEV2DroidSheet._prepareContext`.
   *
   * Phase 7: this builder no longer constructs its own second
   * `PanelContextBuilder` (and therefore no longer builds its own
   * healthPanel/defensePanel/secondWindPanel/biographyPanel/abilitiesPanel).
   * Tracing every consumer of this method's return value (character-like-
   * sheet.js's `_prepareContextForActorSheet`, and every live-included Droid
   * template) proved those five panels were built here but never read from
   * this object — the shared `panelContexts.*` built once by
   * `SWSEV2CharacterLikeSheet` via `new PanelContextBuilder(this.document,
   * this)` (real ApplicationV2 `isEditable`) were always the values actually
   * rendered. This was dead, duplicate computation using a divergent (and
   * incorrect) editability authority, not a genuine second data source — see
   * docs/audits/v2-phase-7-droid-context-convergence.md §5/§6.
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

    // Phase 7: Build droid-specific context variants
    const degree = this.buildDegreeNormalization();
    const resolvedSystems = this.buildResolvedSystems();
    const sourceStatus = this.buildSourceStatus(resolvedSystems);
    const requiredSystems = this.buildRequiredSystemsDefaults(droidPanels);
    const garage = this.buildGarageContext();
    const flags = this.buildFlagsContext();
    const sheetThemeContext = ThemeResolutionService.buildSurfaceContext({ actor: this.actor });

    return {
      // NOTE: the 'actor' Document is intentionally NOT included; consumers use
      // `document` from the base context.
      system: this.system,
      items: projectItems(asItemArray(this.actor?.items)),
      equipment,
      armor,
      weapons,
      combatWeapons: this.buildCombatWeapons(weapons, droidPanels),
      ownedActorMap,
      feats: abilityCards.feats,
      talents: abilityCards.talents,
      racialAbilities: abilityCards.racialAbilities,
      droidPanels,
      sheetTheme: sheetThemeContext.themeKey,
      sheetMotionStyle: sheetThemeContext.motionStyle,
      sheetThemeStyleInline: sheetThemeContext.themeStyleInline,
      sheetMotionStyleInline: sheetThemeContext.motionStyleInline,
      sheetSurfaceStyleInline: sheetThemeContext.surfaceStyleInline,
      droid: {
        degree,
        layoutMode: degree.layoutMode,
        systems: droidPanels,
        requiredSystems,
        resolvedSystems,
        garage,
        flags,
        sourceStatus,
        stockStatblockControls: this.buildStockStatblockControlsPanel(),
        reconciliationControls: this.buildReconciliationControlsPanel()
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
    return projectItems(asItemArray(this.actor?.items).filter((item) => item.type === "equipment"));
  }

  buildArmorEntries() {
    return projectItems(asItemArray(this.actor?.items).filter((item) => item.type === "armor"));
  }

  buildWeaponEntries() {
    return projectItems(asItemArray(this.actor?.items).filter((item) => ["weapon", "lightsaber"].includes(item.type)));
  }

  buildCombatWeapons(weapons, droidPanels) {
    const all = Array.isArray(weapons) ? weapons : [];
    const integrated = all.filter((weapon) => weapon.integrated === true);
    const handheld = all.filter((weapon) => weapon.integrated !== true);
    const integratedParts = Array.isArray(droidPanels?.integratedWeapons?.entries)
      ? droidPanels.integratedWeapons.entries.filter((part) => !all.some((weapon) => weapon.id === part.id))
      : [];
    const unarmed = buildUnarmedAttackContext(this.actor);
    const rollableIntegratedParts = integratedParts.filter((part) => part?.canRoll === true || Boolean(part?.weaponProfile) || Boolean(part?.damage));
    return {
      unarmed,
      handheld,
      integrated,
      integratedParts,
      rollableIntegratedParts,
      all: [unarmed, ...handheld, ...integrated, ...integratedParts],
      hasHandheld: handheld.length > 0,
      hasIntegrated: integrated.length > 0,
      hasIntegratedParts: integratedParts.length > 0,
      hasIntegratedCombat: integrated.length > 0 || rollableIntegratedParts.length > 0,
      hasAny: handheld.length > 0 || integrated.length > 0 || integratedParts.length > 0 || Boolean(unarmed)
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
   * These payloads are additive — they do not replace existing top-level keys
   * consumed by the frame/tab partials.
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
      stockConversion: this.actor?.flags?.swse?.stockDroidConversionReport,
      // Droid Authority Consolidation Phase 3: whether this droid is still a
      // frozen published statblock (derived recalculation intentionally
      // skipped — see scripts/utils/hardening.js#shouldSkipDerivedData) and
      // therefore eligible for the "Convert to Playable" action.
      isStockStatblockMode: isDroidStatblockMode(this.actor)
    };
  }

  /**
   * PHASE 3 — Droid Stock-Statblock Authority. Deliberately a separate,
   * distinctly-labeled control set from droid.garage.canConvert /
   * droid.sourceStatus (which target the older, unreachable legacy Droid
   * Builder "convert into a full custom Garage build" workflow — see
   * docs/audits/droid-stock-statblock-authority-phase-3.md). This governs
   * only the lightweight calculation-mode flip
   * (scripts/domain/droids/droid-statblock-conversion-service.js): does the
   * droid use its published statblock totals, or normal derived math.
   */
  buildStockStatblockControlsPanel() {
    const resolution = resolveDroidCalculationMode(this.actor);
    // Phase 7: `canAct` gates presentation controls (the conversion/rollback
    // buttons), so it now reads the authoritative sheet-editability value
    // passed in from SWSEV2DroidSheet instead of reconstructing an
    // owner-or-GM guess locally. `isOwner` is kept as its own field — it is
    // genuine ownership information some callers may still want to display —
    // but no longer doubles as the presentation-permission gate.
    const isOwner = this.actor?.isOwner === true;
    const canAct = this.isEditable;
    const importState = this.actor?.flags?.swse?.stockDroidImport ?? null;
    const conversionState = this.actor?.flags?.swse?.stockDroidConversion ?? null;

    return {
      visible: Boolean(importState),
      mode: resolution.mode,
      modeLabel: resolution.mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK ? 'Published Statblock Mode' : 'Playable (Derived)',
      isStock: resolution.mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK,
      isConverted: resolution.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED && Boolean(conversionState),
      modeInferred: resolution.inferred,
      modeReason: resolution.reason,
      isOwner,
      canAct,
      canConvert: canAct && resolution.mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK,
      canRollback: canAct && resolution.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED && Number.isFinite(conversionState?.snapshotTimestamp),
      sourceName: importState?.sourceName ?? null,
      importedAt: importState?.importedAt ?? null,
      convertedAt: conversionState?.convertedAt ?? null
    };
  }

  /**
   * PHASE 4 — Converted-System Reconciliation. Cheap, synchronous
   * candidate-count preview for the sheet badge — mirrors
   * scripts/domain/droids/droid-converted-system-reconciliation-service.js's
   * inspectReconciliation() classification exactly (same classifier, same
   * inputs) but stays synchronous since sheet context preparation is not
   * async here. For the full inspection report (with reasons/warnings),
   * the sheet's "Inspect Published Systems" button calls the async service
   * directly — see scripts/sheets/v2/character-sheet.js.
   */
  buildReconciliationControlsPanel() {
    const importState = this.actor?.flags?.swse?.stockDroidImport ?? null;
    if (!importState) return { visible: false };

    const resolution = resolveDroidCalculationMode(this.actor);
    // Phase 7: see buildStockStatblockControlsPanel()'s comment above —
    // same authoritative-editability normalization.
    const canAct = this.isEditable;

    const publishedDroidSystems = importState.publishedTotals?.droidSystems ?? {};
    const sourceEntries = [];
    for (const field of DROID_SYSTEMS_SOURCE_FIELDS.single) {
      const entry = publishedDroidSystems[field];
      if (entry && typeof entry === 'object' && (entry.id || entry.name)) sourceEntries.push({ sourcePath: field, entry });
    }
    for (const field of DROID_SYSTEMS_SOURCE_FIELDS.array) {
      const list = Array.isArray(publishedDroidSystems[field]) ? publishedDroidSystems[field] : [];
      list.forEach((entry, index) => {
        if (entry && typeof entry === 'object' && (entry.id || entry.name)) sourceEntries.push({ sourcePath: `${field}.${index}`, entry });
      });
    }

    const existingWeaponIds = this.actor?.items
      ? Array.from(this.actor.items).filter(i => i?.flags?.swse?.stockDroidAttack).map(i => normalizeDroidPartId(i.system?.droidPartId ?? i.name)).filter(Boolean)
      : [];

    let candidates = classifyStockSystemSources(sourceEntries, {
      normalizeId: normalizeDroidPartId,
      getDefinition: (id) => getDroidPartDefinition(id),
      allDefinitions: getAllDroidPartDefinitions(),
      existingLedger: this.actor?.system?.installedSystems ?? {}
    });
    candidates = annotateWeaponCandidatesAgainstExistingItems(candidates, existingWeaponIds);

    const unreconciled = candidates.filter(c => !c.alreadyInstalled);
    const reconciliationState = this.actor?.flags?.swse?.stockDroidReconciliation ?? null;

    return {
      visible: true,
      isPlayable: resolution.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED,
      canAct,
      canReconcile: canAct && resolution.mode === DROID_CALCULATION_MODE.PLAYABLE_DERIVED && unreconciled.length > 0,
      canRollback: canAct && Number.isFinite(reconciliationState?.snapshotTimestamp),
      unreconciledCount: unreconciled.length,
      autoApplicableCount: unreconciled.filter(c => c.selectedByDefault).length,
      needsReviewCount: unreconciled.filter(c => c.classification === RECONCILIATION_CLASSIFICATION.AMBIGUOUS_MATCH).length,
      descriptiveOnlyCount: unreconciled.filter(c => c.classification === RECONCILIATION_CLASSIFICATION.DESCRIPTIVE_ONLY).length,
      reconciledAt: reconciliationState?.reconciledAt ?? null
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
      // Phase 7: presentation editability, not raw ownership — see the
      // constructor's isEditable doc comment.
      canEdit: this.isEditable,
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
      ? droidSystems.weapons.map((item, idx) => {
          const weaponProfile = item.weaponProfile ?? (Array.isArray(item.weaponProfiles) ? item.weaponProfiles[0] : null);
          const damage = firstDefined(item.damage, item.damageFormula, weaponProfile?.damage, "");
          const range = firstDefined(item.range, item.rangeText, weaponProfile?.range, weaponProfile?.mode, "");
          const attackBonus = firstDefined(item.attackBonus, item.attack, weaponProfile?.attackBonus, null);
          return {
            id: item.id ?? `weapon-${idx}`,
            name: item.name ?? weaponProfile?.name ?? "",
            cost: Number(item.cost ?? 0),
            type: item.type ?? weaponProfile?.weaponType ?? "built-in",
            description: item.description ?? weaponProfile?.description ?? "",
            weaponProfile,
            damage,
            damageBonus: item.damageBonus ?? "",
            range,
            meleeOrRanged: item.meleeOrRanged ?? weaponProfile?.mode ?? "melee",
            attackBonus: Number.isFinite(Number(attackBonus)) ? Number(attackBonus) : null,
            canRoll: Boolean(damage || weaponProfile?.damage || weaponProfile?.damageBySize)
          };
        })
      : [];

    // Also include weapon items from actor.items that carry the integrated flag.
    // Integrated droid weapons are chassis-mounted, so they are combat-ready even
    // when the item does not also carry the generic system.equipped flag.
    const builderIds = new Set(builderEntries.map(e => e.id).filter(Boolean));
    const itemEntries = (this.actor?.items ?? [])
      .filter(i =>
        ["weapon", "lightsaber"].includes(i.type) &&
        (isTruthyState(i.system?.integrated) || isTruthyState(i.flags?.swse?.integrated)) &&
        !builderIds.has(i.id)
      )
      .map(i => {
        const system = i.system ?? {};
        const weaponProfile = readWeaponProfile(system);
        return {
          id: i.id,
          name: i.name ?? "",
          cost: Number(system.cost ?? system.price ?? 0),
          type: firstDefined(system.weaponType, system.weaponCategory, system.category, "built-in"),
          description: system.description ?? "",
          // Phase 6: weapon metadata for Systems tab display
          weaponProfile,
          damage: firstDefined(system.damage, system.damageFormula, weaponProfile?.damage, ""),
          damageBonus: system.damageBonus ?? "",
          range: firstDefined(system.range, system.rangeText, weaponProfile?.range, weaponProfile?.mode, ""),
          meleeOrRanged: system.meleeOrRanged ?? weaponProfile?.mode ?? "melee",
          attackBonus: Number.isFinite(Number(firstDefined(system.attackBonus, weaponProfile?.attackBonus)))
            ? Number(firstDefined(system.attackBonus, weaponProfile?.attackBonus)) : null,
          canRoll: true,
          equipped: true,
          integrated: true
        };
      });

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

    // Phase 7: this CTA gates a presentation action ("open the Garage to fix
    // this"), so it follows the authoritative sheet-editability value rather
    // than raw ownership — a GM without literal actor ownership can still
    // see and act on the recommendation, matching every other edit control
    // on the sheet.
    const garageRecommended =
      this.isEditable &&
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
    // Phase 7: these gate real, live-rendered controls in
    // droid-systems-panel.hbs (the "Open Garage" button, the locked-systems
    // notice). They previously gated on raw `actor.isOwner`, which
    // disagreed with the sheet-wide rule (`canUseActorSheetEditControls` /
    // the real ApplicationV2 `isEditable` getter) that a GM can always use
    // edit controls, even on a droid it does not personally own. Normalized
    // to the authoritative sheet-presentation editability value passed in
    // from SWSEV2DroidSheet. See docs/audits/
    // v2-phase-7-droid-context-convergence.md §4/§9.
    const canEditSheet = this.isEditable;
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
      canEdit: canEditSheet,
      canCustomize: canEditSheet && hasConfiguration,
      canConvert: canEditSheet && isStock,
      openMode: hasConfiguration ? 'EDIT' : 'NEW',
      hasConfiguration,
      // Phase 5
      systemsLocked,
      isFinalized,
      lockReason,
      canOpenGarage: canEditSheet,
      canManageSystems: canEditSheet,
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
    return asItemArray(this.actor?.items)
      .filter((item) => item.type === "customization")
      .reduce((sum, item) => sum + Number(item.system?.costPoints ?? 1), 0);
  }

  _calculateAvailableModPoints() {
    return this._calculateMaxModPoints() - this._calculateUsedModPoints();
  }
}
