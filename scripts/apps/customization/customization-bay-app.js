/**
 * Customization Bay App
 *
 * Unified V2 shell for Droid Garage and Starship Shipyard customization lanes.
 *
 * This app is intentionally UI-only:
 * - It displays profiles, available systems, preview data, legality/status rails,
 *   and mentor guidance.
 * - It delegates all rule math, costs, validation, and actor mutation to existing
 *   droid/vehicle customization engines.
 * - It is designed as the future insertion point for Store Quote and Chargen Draft
 *   contexts without creating parallel store/progression logic.
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { DroidCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/droid-customization-engine.js";
import { VehicleCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/vehicle-customization-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { TechSpecialistModificationService } from "/systems/foundryvtt-swse/scripts/engine/customization/tech-specialist-modification-service.js";
import { getMentorPortraitPath } from "/systems/foundryvtt-swse/scripts/mentor/mentor-portrait-registry.js";

const SYSTEM_ID = "foundryvtt-swse";

const MODE = Object.freeze({
  GARAGE: "garage",
  SHIPYARD: "shipyard"
});

const CONTEXT_MODE = Object.freeze({
  BUILD_NEW: "buildNew",
  MODIFY_EXISTING: "modifyExisting",
  STORE_QUOTE: "storeQuote",
  CHARGEN_DRAFT: "chargenDraft"
});

const MODE_CONFIG = Object.freeze({
  garage: {
    mode: MODE.GARAGE,
    label: "Droid Garage",
    appTitle: "Droid Garage",
    subtitle: "Customization Bay // Droid Garage",
    actorType: "droid",
    glyph: "⏣",
    mentorName: "Seraphim",
    mentorRole: "Droid Garage Mentor",
    mentorClass: "seraphim",
    mentorChannel: "DIAG-INT",
    // Mentor identity contract (Phase 1 — Garage/Shipyard Foundation):
    // mentorDialogueKey resolves data/dialogue/mentors/**/*.json via
    // scripts/engine/mentor/mentor-json-loader.js#getMentor(); mentorPortraitKey
    // resolves the canonical WebP via mentor-portrait-registry.js; mentorTopic
    // scopes the dialogue JSON's contextual key set (dialogues.garage.*);
    // mentorTranslationKey is what MentorTranslationIntegration expects (must
    // match a key/substring in scripts/ui/dialogue/translation-presets.js).
    mentorDialogueKey: "seraphim",
    mentorPortraitKey: "seraphim",
    mentorTopic: "garage",
    mentorTranslationKey: "Seraphim",
    mentorFallback:
      "Chassis integrity is stable. Select systems, validate cost and legality, then let the engine apply the mutation.",
    stageLabels: ["Chassis", "Role", "Locomotion", "Appendages", "Systems", "Compliance", "Chargen Lock"],
    primaryMetricLabel: "Systems",
    costLabel: "Garage Cost"
  },
  shipyard: {
    mode: MODE.SHIPYARD,
    label: "Starship Shipyard",
    appTitle: "Starship Shipyard",
    subtitle: "Customization Bay // Starship Shipyard",
    actorType: "vehicle",
    glyph: "◭",
    mentorName: "Marl Skindar",
    mentorRole: "Shipyard Mentor",
    mentorClass: "marl-skindar",
    mentorChannel: "SHIPWRIGHT-7",
    mentorDialogueKey: "skindar",
    mentorPortraitKey: "marl-skindar",
    mentorTopic: "shipyard",
    mentorTranslationKey: "Marl Skindar",
    mentorFallback:
      "Slots, legality, and cost are the whole game. Keep the frame street-legal unless you want GM review stamped on the work order.",
    stageLabels: ["Hull Frame", "Role", "Engines", "Hyperdrive", "Hardpoints", "Compliance", "Registry"],
    primaryMetricLabel: "Upgrade Slots",
    costLabel: "Shipyard Cost"
  }
});

const CONTEXT_OPTIONS = Object.freeze([
  { key: CONTEXT_MODE.BUILD_NEW, label: "Build New", tooltipKey: "bay.context.buildNew" },
  { key: CONTEXT_MODE.MODIFY_EXISTING, label: "Modify / Browse Systems", tooltipKey: "bay.context.modifyExisting" },
  { key: CONTEXT_MODE.STORE_QUOTE, label: "Store Quote", tooltipKey: "bay.context.storeQuote" },
  { key: CONTEXT_MODE.CHARGEN_DRAFT, label: "Chargen Draft", tooltipKey: "bay.context.chargenDraft" }
]);

const CATEGORY_LABELS = Object.freeze({
  chassis: "Chassis",
  locomotion: "Locomotion",
  appendage: "Appendage",
  appendages: "Appendages",
  processor: "Processor",
  processors: "Processors",
  sensor: "Sensor",
  sensors: "Sensors",
  armor: "Armor",
  tool: "Tool",
  restricted: "Restricted",
  hull: "Hull",
  engines: "Engines",
  hyperdrive: "Hyperdrive",
  shields: "Shields",
  "hull-armor": "Hull Armor",
  weapons: "Weapons",
  cargo: "Cargo",
  crew: "Crew",
  systems: "Systems",
  misc: "Misc"
});

function normalizeMode(value, actor) {
  if (value === MODE.GARAGE || value === MODE.SHIPYARD) return value;
  if (actor?.type === "vehicle") return MODE.SHIPYARD;
  return MODE.GARAGE;
}

function normalizeContextMode(value, actor) {
  if (Object.values(CONTEXT_MODE).includes(value)) return value;
  return actor ? CONTEXT_MODE.MODIFY_EXISTING : CONTEXT_MODE.BUILD_NEW;
}

function getSystemSetting(key, fallback = null) {
  try {
    return game?.settings?.get?.(SYSTEM_ID, key) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function formatCredits(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0 cr";
  return `${number.toLocaleString()} cr`;
}

function humanize(value) {
  return String(value ?? "misc")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function categoryFromSystem(system, mode) {
  const raw = system?.type || system?.slot || system?.category || "systems";
  const normalized = String(raw).toLowerCase().replace(/_/g, "-");

  if (mode === MODE.SHIPYARD) {
    if (normalized.includes("engine")) return "engines";
    if (normalized.includes("hyper")) return "hyperdrive";
    if (normalized.includes("shield")) return "shields";
    if (normalized.includes("armor") || normalized.includes("hull")) return "hull-armor";
    if (normalized.includes("weapon")) return "weapons";
    if (normalized.includes("sensor")) return "sensors";
    if (normalized.includes("cargo") || normalized.includes("smuggl")) return "cargo";
    if (normalized.includes("crew") || normalized.includes("life")) return "crew";
    return normalized || "systems";
  }

  if (normalized.includes("loco")) return "locomotion";
  if (normalized.includes("append")) return "appendage";
  if (normalized.includes("process")) return "processor";
  if (normalized.includes("sensor")) return "sensor";
  if (normalized.includes("armor")) return "armor";
  if (normalized.includes("tool")) return "tool";
  return normalized || "systems";
}

function legalityFromPreview(previewResult, state = {}) {
  if (previewResult?.success === false) {
    return {
      key: "blocked",
      label: "GM REVIEW",
      tone: "negative",
      gmReview: "Required",
      notes: [previewResult.error || "Build requires review before it can be applied."]
    };
  }

  const warnings = Array.isArray(state.warnings) ? state.warnings : [];
  if (warnings.length) {
    return {
      key: "license",
      label: "LICENSE REQUIRED",
      tone: "neutral",
      gmReview: "Conditional",
      notes: warnings
    };
  }

  return {
    key: "legal",
    label: "LEGAL",
    tone: "positive",
    gmReview: "Not Required",
    notes: []
  };
}

function summarizePreview(previewResult, currentCredits = 0) {
  if (!previewResult?.success || !previewResult.preview) {
    return {
      addCost: 0,
      addCostLabel: formatCredits(0),
      resale: 0,
      resaleLabel: formatCredits(0),
      netCost: 0,
      netCostLabel: formatCredits(0),
      newCredits: currentCredits,
      newCreditsLabel: formatCredits(currentCredits),
      additions: [],
      removals: []
    };
  }

  const preview = previewResult.preview;
  const addCost = preview.totalAddCost ?? 0;
  const resale = preview.totalRemoveSale ?? 0;
  const netCost = preview.netCost ?? 0;
  const newCredits = preview.newCredits ?? currentCredits;
  return {
    addCost,
    addCostLabel: formatCredits(addCost),
    resale,
    resaleLabel: formatCredits(resale),
    netCost,
    netCostLabel: formatCredits(netCost),
    newCredits,
    newCreditsLabel: formatCredits(newCredits),
    additions: preview.systemsAdded ?? [],
    removals: preview.systemsRemoved ?? []
  };
}

function buildRowsFromGroups(groups) {
  return Object.entries(groups).map(([key, systems]) => ({
    key,
    label: CATEGORY_LABELS[key] ?? humanize(key),
    systems
  }));
}

export class CustomizationBayApp extends BaseSWSEAppV2 {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
    this.mode = normalizeMode(options.mode, actor);
    this.contextMode = normalizeContextMode(options.contextMode, actor);
    this.selectedAdditions = new Set(options.selectedAdditions ?? []);
    this.selectedRemovals = new Set(options.selectedRemovals ?? []);
    this.focusCategory = options.focusCategory ?? options.region ?? null;
    this.focusSlot = options.focusSlot ?? options.slot ?? null;
    this.focusMode = options.focusMode ?? null;
    this.inlineShell = Boolean(options.inlineShell);
    // PART 1/2 — Owner/wallet authority (Phase 1). ownerActorId is threaded
    // through the live route (ShellHost -> ShellSurfaceRegistry ->
    // CustomizationSurfaceAdapter -> here) when this bay was opened from an
    // owner's Asset Bay. It is resolved into an actual wallet actor lazily by
    // #getWalletActor(), never assumed to equal the target asset actor.
    this.ownerActorId = options.ownerActorId || null;
    // Per-instance cache for contextual mentor dialogue lines, mirroring
    // ItemCustomizationWorkbench's own _workbenchDialogueCache pattern —
    // reused, not reinvented.
    this._mentorDialogueCache = new Map();
  }

  /**
   * The droid/vehicle actually being modified. Kept as an alias of `this.actor`
   * (unchanged for compatibility) so callers/tests can be explicit about which
   * of the two authorities (asset vs. wallet) they mean.
   * @returns {Actor|null}
   */
  get assetActor() {
    return this.actor;
  }

  // PR #947 final correction — swse-ui-shell was removed from this list.
  // Audited its effective CSS (styles/ui/swse-holo-phase1.css): on this
  // application root it independently painted a full min-height:100%
  // screen background, an absolutely-positioned ::before page-frame SVG
  // overlay, and backdrop-filter:blur(6px) — a second, generic frame
  // authority sitting above the dedicated
  // .swse-customization-bay-standalone-frame chrome. Its only non-frame
  // contributions (typography, tooltip focus-visible styling, select/
  // option theming) are already provided redundantly by swse-datapad
  // (kept) and by .application.swse (Foundry's own base class, already
  // present), so nothing is lost by dropping it.
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}),
    {
      id: "swse-customization-bay",
      classes: ["swse", "swse-customization-bay-app", "swse-datapad"],
      window: {
        title: "Customization Bay",
        resizable: true
      },
      position: { width: 1220, height: 820 }
    }
  );

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/customization/customization-bay.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = MODE_CONFIG[this.mode] ?? MODE_CONFIG.garage;
    const actorMatchesMode = !this.actor || this.actor.type === config.actorType;

    const themeKey = getActorSheetTheme(
      this.actor?.getFlag?.(SYSTEM_ID, "sheetTheme") ?? getSystemSetting("sheetTheme", undefined)
    );
    const motionStyle = getActorSheetMotionStyle(
      this.actor?.getFlag?.(SYSTEM_ID, "sheetMotionStyle") ?? getSystemSetting("sheetMotionStyle", undefined)
    );
    const themeStyleInline = buildActorSheetThemeStyle(themeKey);
    const motionStyleInline = buildActorSheetMotionStyle(motionStyle);

    const runtime = actorMatchesMode
      ? await this.#buildRuntimeContext(config)
      : await this.#buildPlaceholderContext(config, `No ${config.actorType} actor is bound to this bay lane.`);

    const contextOptions = CONTEXT_OPTIONS.map((option) => ({
      ...option,
      active: option.key === this.contextMode
    }));

    const modeOptions = Object.values(MODE_CONFIG).map((entry) => ({
      key: entry.mode,
      label: entry.label,
      glyph: entry.glyph,
      active: entry.mode === this.mode
    }));

    return {
      ...context,
      actor: this.actor,
      appTitle: "Customization Bay",
      mode: this.mode,
      modeLabel: config.label,
      config,
      modeOptions,
      contextMode: this.contextMode,
      contextOptions,
      themeKey,
      motionStyle,
      themeStyleInline,
      motionStyleInline,
      canApply: runtime.canApply && this.#hasChanges(),
      hasChanges: this.#hasChanges(),
      actorMatchesMode,
      ...runtime
    };
  }

  wireEvents() {
    this.onRoot("click", "[data-action]", async (event, target) => {
      const action = target.dataset.action;
      if (!action) return;
      event.preventDefault();
      await this.handleInlineAction(action, target);
    });
  }

  /**
   * Handle an action when the Customization Bay is hosted inline inside the
   * character holopad shell instead of its standalone ApplicationV2 window.
   * This keeps the shell adapter on the same private action path as the
   * original app and avoids duplicating garage/shipyard behavior.
   *
   * @param {string} action
   * @param {HTMLElement} target
   */
  async handleInlineAction(action, target) {
    if (!action) return;

    switch (action) {
      case "set-mode":
        this.#setMode(target?.dataset?.mode);
        break;
      case "set-context":
        this.#setContextMode(target?.dataset?.context);
        break;
      case "browse-systems":
        this.#browseSystems();
        break;
      case "add-system":
        this.#toggleAddition(target?.dataset?.systemId);
        break;
      case "remove-system":
        this.#toggleRemoval(target?.dataset?.systemId);
        break;
      case "reset-build":
        this.#resetSelections();
        break;
      case "close-bay":
        await this.close();
        break;
      case "validate-build":
        this.#notifyValidation();
        break;
      case "request-gm-approval":
        this.#notifyGmReview();
        break;
      case "store-quote":
        this.#notifyStoreQuote();
        break;
      case "save-draft":
        this.#notifyDraft();
        break;
      case "apply-build":
        await this.#applyBuild();
        break;
      case "open-tech-specialist":
        await this.#openTechSpecialist();
        break;
      case "designate-signature-device":
        await this.#designateSignatureDevice();
        break;
      case "toggle-tech-signature-trait":
        await this.#toggleTechSignatureTrait(target?.dataset?.traitId);
        break;
      default:
        break;
    }
  }

  async #buildRuntimeContext(config) {
    if (this.mode === MODE.SHIPYARD) return this.#buildVehicleContext(config);
    return this.#buildDroidContext(config);
  }

  async #buildDroidContext(config) {
    if (!this.actor) return this.#buildPlaceholderContext(config, "No droid actor selected.");

    const profileResult = DroidCustomizationEngine.getNormalizedDroidProfile(this.actor);
    const availableResult = DroidCustomizationEngine.getAvailableSystems(this.actor);

    if (!profileResult.success || !availableResult.success) {
      return this.#buildPlaceholderContext(
        config,
        profileResult.error || availableResult.error || "Failed to load droid customization state."
      );
    }

    const systems = availableResult.systems.map((system) => this.#decorateSystem(system, MODE.GARAGE));
    systems.sort((a, b) => this.#focusSort(a, b));
    const groups = {};
    for (const system of systems) {
      groups[system.category] ??= [];
      groups[system.category].push(system);
    }

    // PART 3/4 — assetActor is the droid (systems/eligibility); walletActor is
    // resolved separately and is who pays/receives credits.
    const wallet = this.#getWalletActor();
    const previewResult = DroidCustomizationEngine.previewDroidCustomization(this.actor, this.#changeSet(), { walletActor: wallet });
    const currentCredits = Number(wallet?.system?.credits ?? this.actor.system?.credits ?? 0) || 0;
    const previewSummary = summarizePreview(previewResult, currentCredits);
    const legality = legalityFromPreview(previewResult);
    const profile = profileResult.profile;
    const mentor = await this.#buildMentorPresence(config, previewResult, legality);

    return {
      profile,
      error: null,
      mentor,
      mentorText: mentor.mentorText,
      wallet: this.#buildWalletContext(wallet),
      stageItems: this.#buildStages(config, 4, legality.tone),
      profileStats: [
        { label: "Degree", value: humanize(profile.degree) },
        { label: "Size", value: humanize(profile.size) },
        { label: "Locomotion", value: humanize(profile.locomotion || "Unassigned") },
        { label: "Processor", value: humanize(profile.processor || "Standard") },
        { label: "Appendages", value: String(profile.appendages?.length ?? 0), tone: "neutral" },
        { label: "Credits", value: formatCredits(currentCredits), tone: "positive" }
      ],
      systemGroups: buildRowsFromGroups(groups),
      installedRows: systems.filter((system) => system.installed),
      previewSummary,
      legality,
      garageFocus: this.#buildGarageFocus(),
      readinessRows: [
        { label: "Usable as PC", value: "Engine Check", tone: "neutral" },
        { label: "GM Approval", value: legality.gmReview, tone: legality.tone },
        { label: "Starting Package", value: profile.installedSystems?.length ? "Partial" : "Needs Systems", tone: "neutral" },
        { label: "Unresolved", value: `${this.#hasChanges() ? "1" : "0"} Change Set`, tone: this.#hasChanges() ? "neutral" : "positive" }
      ],
      summaryTitle: "Droid Summary",
      summaryName: profile.actorName ?? this.actor.name,
      summarySubtitle: `${humanize(profile.degree)} · ${humanize(profile.size)}`,
      budget: this.#buildBudget(currentCredits, previewSummary.netCost),
      techSpecialist: this.#buildTechSpecialistContext(MODE.GARAGE),
      canApply: true,
      runtimeLane: true
    };
  }

  #buildGarageFocus() {
    if (!this.focusCategory && !this.focusSlot && !this.focusMode) return null;
    return {
      category: this.focusCategory,
      slot: this.focusSlot,
      mode: this.focusMode,
      label: [this.focusMode, this.focusCategory, this.focusSlot].filter(Boolean).map(humanize).join(' / ')
    };
  }

  #focusSort(a, b) {
    if (!this.focusCategory) return 0;
    const focus = String(this.focusCategory).toLowerCase();
    const aHit = String(a.category ?? '').toLowerCase().includes(focus) || String(a.slot ?? '').toLowerCase().includes(focus);
    const bHit = String(b.category ?? '').toLowerCase().includes(focus) || String(b.slot ?? '').toLowerCase().includes(focus);
    if (aHit === bHit) return String(a.name).localeCompare(String(b.name));
    return aHit ? -1 : 1;
  }

  async #buildVehicleContext(config) {
    if (!this.actor) return this.#buildPlaceholderContext(config, "No vehicle actor selected.");

    const profileResult = VehicleCustomizationEngine.getNormalizedVehicleProfile(this.actor);
    const stateResult = VehicleCustomizationEngine.getVehicleCustomizationState(this.actor);

    if (!profileResult.success || !stateResult.success) {
      return this.#buildPlaceholderContext(
        config,
        profileResult.error || stateResult.error || "Failed to load vehicle customization state."
      );
    }

    const systems = stateResult.systems.map((system) => this.#decorateSystem(system, MODE.SHIPYARD));
    const groups = {};
    for (const system of systems) {
      groups[system.category] ??= [];
      groups[system.category].push(system);
    }

    // PART 3/4 — assetActor is the vehicle (systems/slots); walletActor is
    // resolved separately and is who pays/receives credits.
    const wallet = this.#getWalletActor();
    const previewResult = VehicleCustomizationEngine.previewVehicleCustomization(this.actor, this.#changeSet(), { walletActor: wallet });
    const profile = profileResult.profile;
    const currentCredits = Number(wallet?.system?.credits ?? profile.credits ?? this.actor.system?.credits ?? 0) || 0;
    const previewSummary = summarizePreview(previewResult, currentCredits);
    const legality = legalityFromPreview(previewResult);
    const installedCount = profile.installedSystems?.length ?? 0;
    const totalSlots = Math.max(9, installedCount + 3);
    const mentor = await this.#buildMentorPresence(config, previewResult, legality);

    return {
      profile,
      error: null,
      mentor,
      mentorText: mentor.mentorText,
      wallet: this.#buildWalletContext(wallet),
      stageItems: this.#buildStages(config, 5, legality.tone),
      profileStats: [
        { label: "Vehicle Type", value: humanize(profile.vehicleType) },
        { label: "Speed", value: String(profile.speed ?? 0), tone: "positive" },
        { label: "Armor", value: String(profile.armor ?? 0) },
        { label: "Systems", value: `${installedCount}` },
        { label: "Slots", value: `${installedCount} / ${totalSlots}`, tone: "neutral" },
        { label: "Credits", value: formatCredits(currentCredits), tone: "positive" }
      ],
      systemGroups: buildRowsFromGroups(groups),
      installedRows: systems.filter((system) => system.installed),
      previewSummary,
      legality,
      readinessRows: [
        { label: "Upgrade Slots", value: `${installedCount} / ${totalSlots}`, tone: "neutral" },
        { label: "GM Approval", value: legality.gmReview, tone: legality.tone },
        { label: "Store Quote", value: "Engine Pending", tone: "neutral" },
        { label: "Registry", value: legality.label, tone: legality.tone }
      ],
      slotMeter: this.#buildSlotMeter(installedCount, totalSlots),
      summaryTitle: "Ship Summary",
      summaryName: profile.actorName ?? this.actor.name,
      summarySubtitle: `${humanize(profile.vehicleType)} · ${humanize(this.contextMode)}`,
      budget: this.#buildBudget(currentCredits, previewSummary.netCost),
      techSpecialist: this.#buildTechSpecialistContext(MODE.SHIPYARD),
      canApply: true,
      runtimeLane: true
    };
  }

  async #buildPlaceholderContext(config, message) {
    const legality = {
      key: "review",
      label: "CONCEPT ONLY",
      tone: "neutral",
      gmReview: "Future Engine",
      notes: [message]
    };

    const systems = this.#placeholderSystems(config.mode);
    const groups = {};
    for (const system of systems) {
      groups[system.category] ??= [];
      groups[system.category].push(system);
    }

    const mentor = await this.#buildMentorPresence(config, null, legality);

    return {
      profile: null,
      error: message,
      mentor,
      mentorText: mentor.mentorText,
      wallet: null,
      stageItems: this.#buildStages(config, 1, "neutral"),
      profileStats: this.#placeholderStats(config.mode),
      systemGroups: buildRowsFromGroups(groups),
      installedRows: systems.filter((system) => system.installed),
      previewSummary: summarizePreview(null, 0),
      legality,
      readinessRows: [
        { label: "Runtime", value: "Concept", tone: "neutral" },
        { label: "Engine", value: "Not Bound", tone: "neutral" },
        { label: "Mutation", value: "Disabled", tone: "positive" },
        { label: "V2 Boundary", value: "Preserved", tone: "positive" }
      ],
      slotMeter: this.#buildSlotMeter(6, 9),
      summaryTitle: config.mode === MODE.SHIPYARD ? "Ship Summary" : "Droid Summary",
      summaryName: config.mode === MODE.SHIPYARD ? "Grey Kestrel (Concept)" : "Unit R7-X9 (Concept)",
      summarySubtitle: config.mode === MODE.SHIPYARD ? "Light Freighter · Smuggler" : "2nd-Degree · Astromech/Slicer",
      budget: this.#buildBudget(0, 0),
      canApply: false,
      runtimeLane: false
    };
  }

  #decorateSystem(system, mode) {
    const id = String(system?.id ?? "");
    const category = categoryFromSystem(system, mode);
    const selectedAdd = this.selectedAdditions.has(id);
    const selectedRemove = this.selectedRemovals.has(id);
    const installed = Boolean(system?.installed);
    const compatible = system?.compatible !== false;
    const canAdd = !installed && compatible;
    const canRemove = installed;

    return {
      ...system,
      id,
      name: system?.name ?? humanize(id),
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? humanize(category),
      costLabel: formatCredits(system?.cost ?? 0),
      resaleLabel: formatCredits(system?.resale ?? Math.floor((system?.cost ?? 0) * 0.5)),
      description: system?.description || "No description available.",
      installed,
      compatible,
      selectedAdd,
      selectedRemove,
      canAdd,
      canRemove,
      action: installed ? "remove-system" : "add-system",
      actionLabel: installed ? (selectedRemove ? "Keep Installed" : "Uninstall") : (selectedAdd ? "Remove from Draft" : "Install"),
      actionDisabled: !installed && !compatible,
      tone: !compatible ? "negative" : installed ? "positive" : "neutral"
    };
  }

  #placeholderSystems(mode) {
    if (mode === MODE.SHIPYARD) {
      return [
        { id: "upgraded-sublight", name: "Upgraded Sublight Engines", category: "engines", categoryLabel: "Engines", costLabel: "12,000 cr", installed: true, compatible: true, description: "+2 speed profile. Runtime engine hook pending.", actionDisabled: true, actionLabel: "Installed", tone: "positive" },
        { id: "class-1-hyperdrive", name: "Class 1 Hyperdrive", category: "hyperdrive", categoryLabel: "Hyperdrive", costLabel: "8,400 cr", installed: true, compatible: true, description: "Fast hyperspace motivator. Runtime engine hook pending.", actionDisabled: true, actionLabel: "Installed", tone: "positive" },
        { id: "reinforced-shields", name: "Reinforced Shield Generator", category: "shields", categoryLabel: "Shields", costLabel: "14,500 cr", installed: true, compatible: true, description: "Military-grade shield projection. Requires compliance review.", actionDisabled: true, actionLabel: "Review", tone: "neutral" },
        { id: "concealed-cargo", name: "Concealed Cargo Compartment", category: "cargo", categoryLabel: "Cargo", costLabel: "6,800 cr", installed: true, compatible: true, description: "Smuggling compartment. Restricted in most jurisdictions.", actionDisabled: true, actionLabel: "Restricted", tone: "negative" },
        { id: "dorsal-laser", name: "Dorsal Laser Cannon", category: "weapons", categoryLabel: "Weapons", costLabel: "9,200 cr", installed: true, compatible: true, description: "Turret hardpoint weapon.", actionDisabled: true, actionLabel: "Installed", tone: "positive" }
      ];
    }

    return [
      { id: "utility-chassis", name: "2nd-Degree Utility Chassis", category: "chassis", categoryLabel: "Chassis", costLabel: "2,800 cr", installed: true, compatible: true, description: "Astromech / technical support frame.", actionDisabled: true, actionLabel: "Selected", tone: "positive" },
      { id: "wheeled", name: "Wheeled Locomotion", category: "locomotion", categoryLabel: "Locomotion", costLabel: "350 cr", installed: true, compatible: true, description: "Fast and compact on stable surfaces.", actionDisabled: true, actionLabel: "Installed", tone: "positive" },
      { id: "magnetic-clamps", name: "Magnetic Clamps", category: "locomotion", categoryLabel: "Locomotion", costLabel: "600 cr", installed: true, compatible: true, description: "Hull-walk clamps for starship service.", actionDisabled: true, actionLabel: "Installed", tone: "positive" },
      { id: "heuristic-processor", name: "Heuristic Processor", category: "processor", categoryLabel: "Processor", costLabel: "1,200 cr", installed: true, compatible: true, description: "Adaptive learning processor.", actionDisabled: true, actionLabel: "Selected", tone: "neutral" },
      { id: "weapon-mount", name: "Weapon Mount", category: "restricted", categoryLabel: "Restricted", costLabel: "2,400 cr", installed: false, compatible: false, description: "Military hardware. GM review required.", actionDisabled: true, actionLabel: "Restricted", tone: "negative" }
    ];
  }

  #placeholderStats(mode) {
    if (mode === MODE.SHIPYARD) {
      return [
        { label: "Hull", value: "Light Freighter" },
        { label: "Role", value: "Smuggler" },
        { label: "Slots", value: "6 / 9", tone: "neutral" },
        { label: "Speed", value: "10", tone: "positive" },
        { label: "Hyperdrive", value: "×1", tone: "positive" },
        { label: "Legal", value: "Restricted", tone: "negative" }
      ];
    }
    return [
      { label: "Chassis", value: "2nd-Degree" },
      { label: "Role", value: "Astromech" },
      { label: "Locomotion", value: "Wheeled+Mag" },
      { label: "Appendages", value: "3", tone: "neutral" },
      { label: "Processor", value: "Heuristic" },
      { label: "Legal", value: "License", tone: "neutral" }
    ];
  }

  #buildStages(config, activeIndex = 1, legalityTone = "neutral") {
    return config.stageLabels.map((label, index) => {
      const oneBased = index + 1;
      const status = oneBased < activeIndex ? "done" : oneBased === activeIndex ? "active" : oneBased === 6 ? legalityTone : "pending";
      return {
        index: String(oneBased).padStart(2, "0"),
        label,
        status,
        marker: status === "done" ? "✓" : status === "active" ? "▸" : status === "negative" ? "!" : "·"
      };
    });
  }

  #buildBudget(currentCredits, netCost) {
    const available = Number(currentCredits ?? 0);
    const cost = Number(netCost ?? 0);
    const safeAvailable = Math.max(available, cost, 1);
    const usedPct = Math.min(100, Math.max(0, (Math.max(cost, 0) / safeAvailable) * 100));
    return {
      currentCreditsLabel: formatCredits(available),
      netCostLabel: formatCredits(cost),
      newCreditsLabel: formatCredits(available - cost),
      usedPct: `${usedPct.toFixed(0)}%`,
      tone: available - cost < 0 ? "negative" : cost > 0 ? "neutral" : "positive"
    };
  }

  #buildSlotMeter(used, total) {
    const rows = [];
    const safeTotal = Math.max(1, Number(total ?? 9));
    const safeUsed = Math.max(0, Number(used ?? 0));
    for (let i = 1; i <= safeTotal; i += 1) {
      rows.push({ index: i, status: i <= safeUsed ? "used" : "free" });
    }
    return rows;
  }

  #buildMentorText(config, legality, previewResult) {
    if (previewResult?.success === false) {
      return `${config.mentorFallback} Current draft is blocked: ${previewResult.error}`;
    }
    if (this.#hasChanges()) {
      return `${config.mentorFallback} Draft changes are staged. Validate, then apply through the engine when ready.`;
    }
    if (legality?.tone === "negative") {
      return `${config.mentorFallback} This build is flagged for review before it becomes street-legal.`;
    }
    return config.mentorFallback;
  }

  /**
   * PART 19/21 — Garage/Shipyard mentor presence. Mentor code is advisory/
   * read-only (PART 23): it only reads already-computed engine output
   * (previewResult/legality/current selection sizes) to pick which
   * contextual dialogue bucket to show — it never determines compatibility,
   * legality, cost, or transaction outcome.
   *
   * @param {object} config - MODE_CONFIG entry for the active mode
   * @param {object|null} previewResult - Result of the engine's preview call
   * @param {object} legality - legalityFromPreview() output
   * @returns {Promise<{mentorKey:string, mentorName:string, mentorTitle:string, mentorPortrait:string, mentorText:string}>}
   */
  async #buildMentorPresence(config, previewResult, legality) {
    const topic = config.mentorTopic;
    const contextKey = this.#pickMentorContext(previewResult, legality);
    const fallback = this.#buildMentorText(config, legality, previewResult);
    const mentorText = await this.#getMentorDialogueLine(config.mentorDialogueKey, [topic, contextKey], fallback)
      || await this.#getMentorDialogueLine(config.mentorDialogueKey, [topic, 'default'], fallback)
      || fallback;
    const portrait = getMentorPortraitPath(config.mentorPortraitKey, '');

    return {
      mentorKey: config.mentorTranslationKey,
      mentorName: config.mentorName,
      mentorTitle: config.mentorRole,
      mentorPortrait: portrait,
      mentorText
    };
  }

  /**
   * Choose which contextual dialogue bucket applies, purely from already-
   * computed engine output — never rules authority itself (PART 23).
   * @returns {'blocked'|'lowFunds'|'noChanges'|'ready'|'stagedInstall'|'stagedRemoval'}
   */
  #pickMentorContext(previewResult, legality) {
    if (previewResult?.success === false) {
      return previewResult.blockingReason === 'Insufficient funds' ? 'lowFunds' : 'blocked';
    }
    if (legality?.tone === 'negative') return 'blocked';
    const adds = this.selectedAdditions.size;
    const removes = this.selectedRemovals.size;
    if (!adds && !removes) return 'noChanges';
    if (removes && !adds) return 'stagedRemoval';
    const clean = legality?.tone === 'positive' && !(legality?.notes?.length);
    return clean ? 'ready' : 'stagedInstall';
  }

  /**
   * Read a random contextual line from the mentor's structured dialogue JSON
   * (data/dialogue/mentors/**), mirroring ItemCustomizationWorkbench's
   * proven _getWorkbenchDialogue() pattern — same authority
   * (scripts/engine/mentor/mentor-json-loader.js#getMentor), not a new
   * mentor dialogue source. Cached per-instance so a given context keeps a
   * stable line across renders until the context itself changes.
   *
   * @param {string} mentorKey - Registry key, e.g. 'seraphim' / 'skindar'
   * @param {string[]} path - Path into mentor.dialogues, e.g. ['garage', 'stagedInstall']
   * @param {string} fallback
   * @returns {Promise<string>}
   */
  async #getMentorDialogueLine(mentorKey, path, fallback = '') {
    const cacheKey = `${mentorKey}:${path.join('.')}`;
    if (this._mentorDialogueCache.has(cacheKey)) return this._mentorDialogueCache.get(cacheKey);
    let value = fallback;
    try {
      const { getMentor } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js');
      const mentor = await getMentor(mentorKey);
      value = path.reduce((node, key) => node?.[key], mentor?.dialogues) ?? fallback;
      if (Array.isArray(value)) value = value[Math.floor(Math.random() * value.length)] || fallback;
      if (value && typeof value === 'object') {
        const defaultValue = value.default;
        value = Array.isArray(defaultValue) ? defaultValue[Math.floor(Math.random() * defaultValue.length)] : (defaultValue || fallback);
      }
    } catch (err) {
      SWSELogger.error('[CustomizationBayApp] Failed to load mentor dialogue', { mentorKey, path, error: err });
    }
    this._mentorDialogueCache.set(cacheKey, value || fallback);
    return value || fallback;
  }

  /**
   * Display-only summary of the resolved wallet actor, for template use
   * (e.g. distinguishing an owner-funded build from a self-funded one).
   * Never used to determine affordability itself — that stays in the
   * engines/TransactionEngine.
   */
  #buildWalletContext(wallet) {
    if (!wallet) return null;
    return {
      id: wallet.id,
      name: wallet.name,
      isOwnerFunded: Boolean(this.actor && wallet.id !== this.actor.id)
    };
  }

  #changeSet() {
    return {
      add: Array.from(this.selectedAdditions),
      remove: Array.from(this.selectedRemovals)
    };
  }

  #hasChanges() {
    return this.selectedAdditions.size > 0 || this.selectedRemovals.size > 0;
  }

  #setMode(mode) {
    const nextMode = normalizeMode(mode, null);
    if (nextMode === this.mode) return;
    this.mode = nextMode;
    this.selectedAdditions.clear();
    this.selectedRemovals.clear();
    this.render({ force: true });
  }

  #setContextMode(contextMode) {
    this.contextMode = normalizeContextMode(contextMode, this.actor);
    this.render({ force: true });
  }

  #toggleAddition(systemId) {
    if (!systemId) return;
    if (this.selectedAdditions.has(systemId)) this.selectedAdditions.delete(systemId);
    else this.selectedAdditions.add(systemId);
    this.selectedRemovals.delete(systemId);
    this.render({ force: true });
  }

  #toggleRemoval(systemId) {
    if (!systemId) return;
    if (this.selectedRemovals.has(systemId)) this.selectedRemovals.delete(systemId);
    else this.selectedRemovals.add(systemId);
    this.selectedAdditions.delete(systemId);
    this.render({ force: true });
  }

  #resetSelections() {
    this.selectedAdditions.clear();
    this.selectedRemovals.clear();
    this.render({ force: true });
  }

  #browseSystems() {
    this.contextMode = CONTEXT_MODE.MODIFY_EXISTING;
    this.focusMode = 'browse-systems';
    ui.notifications.info(this.mode === MODE.SHIPYARD
      ? 'Browse ship systems below, stage installs/removals, then apply through the Shipyard engine.'
      : 'Browse droid systems below, stage installs/removals, then apply through the Droid Garage engine.');
    this.render({ force: true });
  }

  #notifyValidation() {
    ui.notifications.info("Customization Bay validation preview refreshed. Engine validation remains authoritative.");
    this.render({ force: true });
  }

  #notifyGmReview() {
    ui.notifications.info("GM approval request is a future integration point for this unified bay.");
  }

  #notifyStoreQuote() {
    this.contextMode = CONTEXT_MODE.STORE_QUOTE;
    ui.notifications.info("Store quote mode staged. Future production pass should route through store/transaction engines.");
    this.render({ force: true });
  }

  #notifyDraft() {
    ui.notifications.info("Draft save is a future persistence hook. No actor data was changed.");
  }

  /**
   * PART 1/2 — Resolve the wallet actor for this bay's customization.
   *
   * Priority:
   *   1. An explicit owner supplied by the live route (ownerActorId, threaded
   *      through ShellHost -> ShellSurfaceRegistry -> CustomizationSurfaceAdapter
   *      -> here when opened from an owner's Asset Bay).
   *   2. TechSpecialistModificationService.resolveWalletActor() — the
   *      already-existing, already-proven ownership resolver (checks the
   *      asset's own ownedByActorId flags, then game.user.character), reused
   *      rather than duplicated so a direct droid/vehicle-sheet entry with no
   *      explicit owner still resolves a usable wallet (PART 1's "Direct
   *      asset-sheet fallback" contract).
   *
   * @returns {Actor} Never null while this.actor is set — falls back to the
   *   asset actor itself if no owner can be resolved.
   */
  #getWalletActor() {
    const explicit = this.ownerActorId ? game.actors?.get?.(this.ownerActorId) : null;
    return TechSpecialistModificationService.resolveWalletActor(this.actor, explicit || undefined);
  }

  #buildTechSpecialistContext(mode = this.mode) {
    if (!this.actor) return { canUse: false };
    const wallet = this.#getWalletActor();
    const subjectType = mode === MODE.SHIPYARD ? 'vehicle' : 'droid';
    const context = TechSpecialistModificationService.getUiContext(wallet, this.actor, { subjectKind: 'actor', subjectType });
    return {
      ...context,
      walletName: wallet?.name || this.actor?.name || '',
      subjectName: this.actor?.name || '',
      mode
    };
  }

  async #openTechSpecialist() {
    if (!this.actor) return;
    const wallet = this.#getWalletActor();
    const subjectType = this.mode === MODE.SHIPYARD ? 'vehicle' : 'droid';
    await TechSpecialistModificationService.openModificationDialog({ actor: wallet, walletActor: wallet, subject: this.actor, subjectKind: 'actor', subjectType });
    await this.render({ force: true });
  }

  async #designateSignatureDevice() {
    if (!this.actor) return;
    const wallet = this.#getWalletActor();
    await TechSpecialistModificationService.designateSignatureDevice(wallet, this.actor, { subjectKind: 'actor', subjectType: this.mode === MODE.SHIPYARD ? 'vehicle' : 'droid' });
    await this.render({ force: true });
  }

  async #toggleTechSignatureTrait(traitId) {
    if (!this.actor || !traitId) return;
    const wallet = this.#getWalletActor();
    await TechSpecialistModificationService.toggleActiveSignatureTrait(wallet, this.actor, traitId);
    await this.render({ force: true });
  }

  async #applyBuild() {
    if (!this.actor || !this.#hasChanges()) return;

    try {
      const changeSet = this.#changeSet();
      // PART 5 — Apply must use TransactionEngine with two actors: the
      // resolved wallet actor pays/receives credits, the droid/vehicle
      // (this.actor / assetActor) receives the system mutation.
      const wallet = this.#getWalletActor();
      const result = this.mode === MODE.SHIPYARD
        ? await VehicleCustomizationEngine.applyVehicleCustomization(this.actor, changeSet, { walletActor: wallet })
        : await DroidCustomizationEngine.applyDroidCustomization(this.actor, changeSet, { walletActor: wallet });

      if (!result.success) {
        ui.notifications.error(`Failed to apply customization: ${result.error}`);
        return;
      }

      ui.notifications.info("Customization applied through the engine.");
      this.selectedAdditions.clear();
      this.selectedRemovals.clear();
      if (!this.inlineShell) {
        this.actor?.sheet?.render?.(true);
      }
      await this.render({ force: true });
    } catch (err) {
      SWSELogger.error("Customization Bay apply failed:", err);
      ui.notifications.error("Unexpected error while applying customization.");
    }
  }
}

export function openCustomizationBay(actor = null, options = {}) {
  if (!actor) {
    return new CustomizationBayApp(actor, options).render(true);
  }

  const shell = ShellRouter.getShell(actor.id);
  if (shell) {
    // Shell host is open — route to customization surface inside the holopad
    return ShellRouter.openSurface(actor, 'customization', {
      bayMode: options.bayMode || 'garage',
      contextMode: options.contextMode || 'modifyExisting'
    });
  } else {
    // No shell host — fall back to standalone customization bay app
    return new CustomizationBayApp(actor, options).render(true);
  }
}
